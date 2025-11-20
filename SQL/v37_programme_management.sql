-- ================================================
-- File: v37_programme_management.sql
-- Description: Programme Management module tables
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v36 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist
-- - portfolios table must exist (optional, for portfolio-programme relationship)

-- Purpose:
-- Creates tables for Programme Management module:
-- 1. programmes - Programme definitions
-- 2. programme_projects - Project-to-programme assignments
-- 3. programme_benefits - Benefits realization tracking
-- 4. programme_members - Programme team members
-- 5. programme_governance - Programme governance and oversight
-- 6. programme_milestones - Programme-level milestones
-- 7. programme_dependencies - Inter-project dependencies
-- 8. programme_reports - Programme reporting

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS programme_reports CASCADE;
DROP TABLE IF EXISTS programme_dependencies CASCADE;
DROP TABLE IF EXISTS programme_milestones CASCADE;
DROP TABLE IF EXISTS programme_governance CASCADE;
DROP TABLE IF EXISTS programme_members CASCADE;
DROP TABLE IF EXISTS programme_benefits CASCADE;
DROP TABLE IF EXISTS programme_projects CASCADE;
DROP TABLE IF EXISTS programmes CASCADE;

-- ================================================
-- TABLE 1: programmes
-- Description: Programme definitions
-- Category: programme
-- ================================================

CREATE TABLE IF NOT EXISTS programmes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Programme Information
    programme_code VARCHAR(100) UNIQUE,
    programme_name VARCHAR(200) NOT NULL,
    programme_description TEXT,
    programme_vision TEXT,
    programme_mission TEXT,
    
    -- Programme Classification
    programme_type VARCHAR(100), -- 'business_transformation', 'technology', 'infrastructure', 'product', 'regulatory', 'mixed'
    programme_category VARCHAR(100), -- 'it', 'business', 'infrastructure', 'product', 'compliance'
    
    -- Programme Owner & Manager
    programme_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    programme_manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Programme Lifecycle
    programme_start_date DATE,
    programme_end_date DATE,
    programme_status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'active', 'on-hold', 'completed', 'cancelled'
    
    -- Portfolio Relationship (optional - programmes can exist independently or within a portfolio)
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    
    -- Programme Goals & Objectives
    programme_goals TEXT,
    success_criteria TEXT,
    key_deliverables TEXT[],
    expected_outcomes TEXT,
    
    -- Governance
    governance_model VARCHAR(100), -- 'centralized', 'decentralized', 'hybrid'
    review_frequency VARCHAR(50), -- 'weekly', 'bi-weekly', 'monthly', 'quarterly'
    next_review_date DATE,
    last_review_date DATE,
    
    -- Budget & Resources
    total_budget DECIMAL(15,2),
    allocated_budget DECIMAL(15,2),
    spent_budget DECIMAL(15,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    
    -- Programme Metrics (calculated fields, updated via triggers/functions)
    total_projects_count INTEGER DEFAULT 0,
    active_projects_count INTEGER DEFAULT 0,
    completed_projects_count INTEGER DEFAULT 0,
    on_hold_projects_count INTEGER DEFAULT 0,
    overall_progress_percentage DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    overall_health_score DECIMAL(5,2), -- 0-100
    benefits_realization_percentage DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    
    -- Tags and Metadata
    tags TEXT[],
    metadata JSONB,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT programmes_code_unique UNIQUE (programme_code),
    CONSTRAINT programmes_dates_check CHECK (
        programme_end_date IS NULL OR programme_start_date IS NULL OR 
        programme_end_date >= programme_start_date
    )
);

-- Indexes for programmes
CREATE INDEX IF NOT EXISTS idx_programmes_code ON programmes(programme_code);
CREATE INDEX IF NOT EXISTS idx_programmes_status ON programmes(programme_status);
CREATE INDEX IF NOT EXISTS idx_programmes_owner ON programmes(programme_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_programmes_manager ON programmes(programme_manager_user_id);
CREATE INDEX IF NOT EXISTS idx_programmes_portfolio ON programmes(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_programmes_dates ON programmes(programme_start_date, programme_end_date);
CREATE INDEX IF NOT EXISTS idx_programmes_deleted ON programmes(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_programmes_updated_at
    BEFORE UPDATE ON programmes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: programme_projects
-- Description: Project-to-programme assignments
-- Category: programme
-- ================================================

CREATE TABLE IF NOT EXISTS programme_projects (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Assignment Information
    assignment_date DATE DEFAULT CURRENT_DATE,
    assignment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'planned', 'completed', 'removed'
    
    -- Programme-Specific Project Attributes
    programme_priority VARCHAR(50), -- 'critical', 'high', 'medium', 'low'
    priority_order INTEGER DEFAULT 0,
    is_critical_path BOOLEAN DEFAULT FALSE,
    is_strategic_project BOOLEAN DEFAULT FALSE,
    
    -- Project Contribution to Programme
    expected_contribution_percentage DECIMAL(5,2), -- How much this project contributes to programme success (0-100)
    actual_contribution_percentage DECIMAL(5,2),
    
    -- Notes
    assignment_notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes for programme_projects
CREATE INDEX IF NOT EXISTS idx_programme_projects_programme ON programme_projects(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_projects_project ON programme_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_programme_projects_status ON programme_projects(assignment_status);
CREATE INDEX IF NOT EXISTS idx_programme_projects_priority ON programme_projects(programme_priority);
CREATE INDEX IF NOT EXISTS idx_programme_projects_deleted ON programme_projects(is_deleted) WHERE is_deleted = false;

-- Partial unique index to enforce uniqueness for active records only
CREATE UNIQUE INDEX IF NOT EXISTS idx_programme_projects_unique ON programme_projects(programme_id, project_id) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_programme_projects_updated_at
    BEFORE UPDATE ON programme_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: programme_benefits
-- Description: Benefits realization tracking
-- Category: programme
-- ================================================

CREATE TABLE IF NOT EXISTS programme_benefits (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    
    -- Benefit Information
    benefit_code VARCHAR(100),
    benefit_name VARCHAR(200) NOT NULL,
    benefit_description TEXT,
    benefit_category VARCHAR(100), -- 'financial', 'operational', 'strategic', 'compliance', 'customer', 'employee'
    benefit_type VARCHAR(100), -- 'quantifiable', 'qualitative', 'intangible'
    
    -- Benefit Owner
    benefit_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Benefit Measurement
    measurement_unit VARCHAR(50), -- 'currency', 'percentage', 'count', 'hours', 'score', 'text'
    baseline_value DECIMAL(15,2),
    target_value DECIMAL(15,2),
    current_value DECIMAL(15,2),
    realized_value DECIMAL(15,2),
    
    -- Benefit Status & Timeline
    benefit_status VARCHAR(50) DEFAULT 'identified', -- 'identified', 'planned', 'in-progress', 'realized', 'lost', 'cancelled'
    expected_realization_date DATE,
    actual_realization_date DATE,
    
    -- Benefit Attribution
    attribution_methodology TEXT, -- How benefits are attributed to projects
    attribution_percentage DECIMAL(5,2), -- Percentage attributed to this programme (if shared across programmes)
    
    -- Benefit Tracking
    tracking_frequency VARCHAR(50), -- 'weekly', 'monthly', 'quarterly', 'annually'
    last_measured_date DATE,
    next_measurement_date DATE,
    
    -- Benefit Value
    estimated_value DECIMAL(15,2), -- Estimated financial value
    realized_value_currency DECIMAL(15,2), -- Realized financial value
    value_currency VARCHAR(3) DEFAULT 'USD',
    
    -- Notes and Evidence
    notes TEXT,
    evidence_documents TEXT[], -- Array of document references/URLs
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes for programme_benefits
CREATE INDEX IF NOT EXISTS idx_programme_benefits_programme ON programme_benefits(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_benefits_status ON programme_benefits(benefit_status);
CREATE INDEX IF NOT EXISTS idx_programme_benefits_category ON programme_benefits(benefit_category);
CREATE INDEX IF NOT EXISTS idx_programme_benefits_owner ON programme_benefits(benefit_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_programme_benefits_deleted ON programme_benefits(is_deleted) WHERE is_deleted = false;

-- Partial unique index to enforce uniqueness for active records only
CREATE UNIQUE INDEX IF NOT EXISTS idx_programme_benefits_code_unique ON programme_benefits(programme_id, benefit_code) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_programme_benefits_updated_at
    BEFORE UPDATE ON programme_benefits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: programme_members
-- Description: Programme team members
-- Category: programme
-- ================================================

CREATE TABLE IF NOT EXISTS programme_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Member Information
    member_role VARCHAR(100) NOT NULL, -- 'programme_manager', 'programme_coordinator', 'project_manager', 'team_member', 'sponsor', 'stakeholder'
    assignment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'planned', 'completed', 'removed'
    
    -- Permissions
    can_view_all_projects BOOLEAN DEFAULT FALSE,
    can_edit_programme BOOLEAN DEFAULT FALSE,
    can_assign_projects BOOLEAN DEFAULT FALSE,
    can_review_programme BOOLEAN DEFAULT FALSE,
    can_manage_benefits BOOLEAN DEFAULT FALSE,
    
    -- Assignment Dates
    assignment_start_date DATE DEFAULT CURRENT_DATE,
    assignment_end_date DATE,
    
    -- Notes
    assignment_notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes for programme_members
CREATE INDEX IF NOT EXISTS idx_programme_members_programme ON programme_members(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_members_user ON programme_members(user_id);
CREATE INDEX IF NOT EXISTS idx_programme_members_role ON programme_members(member_role);
CREATE INDEX IF NOT EXISTS idx_programme_members_status ON programme_members(assignment_status);
CREATE INDEX IF NOT EXISTS idx_programme_members_deleted ON programme_members(is_deleted) WHERE is_deleted = false;

-- Partial unique index to enforce uniqueness for active records only
CREATE UNIQUE INDEX IF NOT EXISTS idx_programme_members_unique ON programme_members(programme_id, user_id) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_programme_members_updated_at
    BEFORE UPDATE ON programme_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: programme_governance
-- Description: Programme governance and oversight
-- Category: programme
-- ================================================

CREATE TABLE IF NOT EXISTS programme_governance (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key (one-to-one with programme)
    programme_id UUID NOT NULL UNIQUE REFERENCES programmes(id) ON DELETE CASCADE,
    
    -- Governance Structure
    governance_board_name VARCHAR(200),
    governance_model VARCHAR(100), -- 'centralized', 'decentralized', 'hybrid', 'steering_committee'
    governance_structure TEXT,
    
    -- Governance Members (references to programme_members with governance roles)
    governance_board_chair_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Review Schedule
    review_meeting_frequency VARCHAR(50), -- 'weekly', 'bi-weekly', 'monthly', 'quarterly'
    next_review_meeting_date DATE,
    last_review_meeting_date DATE,
    
    -- Decision Making
    decision_making_process TEXT,
    escalation_process TEXT,
    approval_requirements TEXT,
    
    -- Governance Documents
    terms_of_reference TEXT,
    governance_documents TEXT[], -- Array of document references/URLs
    
    -- Status
    governance_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes for programme_governance
CREATE INDEX IF NOT EXISTS idx_programme_governance_programme ON programme_governance(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_governance_status ON programme_governance(governance_status);
CREATE INDEX IF NOT EXISTS idx_programme_governance_deleted ON programme_governance(is_deleted) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_programme_governance_updated_at
    BEFORE UPDATE ON programme_governance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 6: programme_milestones
-- Description: Programme-level milestones
-- Category: programme
-- ================================================

CREATE TABLE IF NOT EXISTS programme_milestones (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    
    -- Milestone Information
    milestone_code VARCHAR(100),
    milestone_name VARCHAR(200) NOT NULL,
    milestone_description TEXT,
    milestone_type VARCHAR(100), -- 'governance', 'delivery', 'benefit', 'integration', 'transition'
    
    -- Milestone Schedule
    planned_date DATE,
    baseline_date DATE,
    forecast_date DATE,
    actual_date DATE,
    
    -- Milestone Status
    milestone_status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in-progress', 'at-risk', 'completed', 'missed', 'cancelled'
    
    -- Milestone Dependencies
    depends_on_milestones UUID[], -- Array of programme_milestones.id
    
    -- Milestone Owner
    milestone_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Success Criteria
    success_criteria TEXT,
    acceptance_criteria TEXT,
    
    -- Related Projects (milestones may be delivered by one or more projects)
    related_project_ids UUID[], -- Array of projects.id
    
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

-- Indexes for programme_milestones
CREATE INDEX IF NOT EXISTS idx_programme_milestones_programme ON programme_milestones(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_milestones_status ON programme_milestones(milestone_status);
CREATE INDEX IF NOT EXISTS idx_programme_milestones_dates ON programme_milestones(planned_date, actual_date);
CREATE INDEX IF NOT EXISTS idx_programme_milestones_owner ON programme_milestones(milestone_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_programme_milestones_deleted ON programme_milestones(is_deleted) WHERE is_deleted = false;

-- Partial unique index to enforce uniqueness for active records only
CREATE UNIQUE INDEX IF NOT EXISTS idx_programme_milestones_code_unique ON programme_milestones(programme_id, milestone_code) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_programme_milestones_updated_at
    BEFORE UPDATE ON programme_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 7: programme_dependencies
-- Description: Inter-project dependencies
-- Category: programme
-- ================================================

CREATE TABLE IF NOT EXISTS programme_dependencies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    
    -- Dependency Information
    dependency_code VARCHAR(100),
    dependency_name VARCHAR(200) NOT NULL,
    dependency_description TEXT,
    dependency_type VARCHAR(100), -- 'finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish', 'logical', 'resource', 'benefit'
    
    -- Source and Target Projects
    source_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Dependency Details
    dependency_strength VARCHAR(50), -- 'hard', 'soft', 'logical'
    dependency_criticality VARCHAR(50), -- 'critical', 'high', 'medium', 'low'
    is_critical_path BOOLEAN DEFAULT FALSE,
    
    -- Dependency Timeline
    lag_days INTEGER DEFAULT 0, -- Days between source completion and target start
    expected_impact_days INTEGER, -- Expected impact if dependency fails
    
    -- Dependency Status
    dependency_status VARCHAR(50) DEFAULT 'identified', -- 'identified', 'confirmed', 'active', 'resolved', 'cancelled'
    resolution_status VARCHAR(50), -- 'none', 'mitigated', 'resolved', 'accepted'
    
    -- Dependency Owner
    dependency_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Risk Assessment
    risk_level VARCHAR(50), -- 'low', 'medium', 'high', 'critical'
    risk_description TEXT,
    mitigation_plan TEXT,
    
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
    CONSTRAINT programme_dependencies_source_target_check CHECK (source_project_id != target_project_id)
);

-- Indexes for programme_dependencies
CREATE INDEX IF NOT EXISTS idx_programme_dependencies_programme ON programme_dependencies(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_dependencies_source ON programme_dependencies(source_project_id);
CREATE INDEX IF NOT EXISTS idx_programme_dependencies_target ON programme_dependencies(target_project_id);
CREATE INDEX IF NOT EXISTS idx_programme_dependencies_status ON programme_dependencies(dependency_status);
CREATE INDEX IF NOT EXISTS idx_programme_dependencies_criticality ON programme_dependencies(dependency_criticality);
CREATE INDEX IF NOT EXISTS idx_programme_dependencies_deleted ON programme_dependencies(is_deleted) WHERE is_deleted = false;

-- Partial unique index to enforce uniqueness for active records only
CREATE UNIQUE INDEX IF NOT EXISTS idx_programme_dependencies_code_unique ON programme_dependencies(programme_id, dependency_code) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_programme_dependencies_updated_at
    BEFORE UPDATE ON programme_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 8: programme_reports
-- Description: Programme reporting
-- Category: programme
-- ================================================

CREATE TABLE IF NOT EXISTS programme_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    
    -- Report Information
    report_code VARCHAR(100),
    report_name VARCHAR(200) NOT NULL,
    report_description TEXT,
    report_type VARCHAR(100), -- 'status', 'progress', 'benefits', 'risks', 'financial', 'governance', 'milestones', 'comprehensive'
    
    -- Report Period
    report_period_start_date DATE,
    report_period_end_date DATE,
    report_period_type VARCHAR(50), -- 'weekly', 'monthly', 'quarterly', 'annually', 'custom'
    report_date DATE DEFAULT CURRENT_DATE,
    
    -- Report Generation
    report_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'published', 'archived'
    generated_by_user_id UUID REFERENCES users(id),
    generated_at TIMESTAMP DEFAULT NOW(),
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Report Content (stored as JSON)
    report_data JSONB, -- Structured report data
    report_summary TEXT, -- Executive summary
    key_highlights TEXT[],
    key_risks TEXT[],
    key_issues TEXT[],
    recommendations TEXT[],
    
    -- Report Metrics
    programme_progress_percentage DECIMAL(5,2),
    benefits_realization_percentage DECIMAL(5,2),
    budget_utilization_percentage DECIMAL(5,2),
    resource_utilization_percentage DECIMAL(5,2),
    overall_health_score DECIMAL(5,2),
    
    -- Report Attachments
    attachments TEXT[], -- Array of document references/URLs
    
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

-- Indexes for programme_reports
CREATE INDEX IF NOT EXISTS idx_programme_reports_programme ON programme_reports(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_reports_type ON programme_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_programme_reports_status ON programme_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_programme_reports_period ON programme_reports(report_period_start_date, report_period_end_date);
CREATE INDEX IF NOT EXISTS idx_programme_reports_date ON programme_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_programme_reports_deleted ON programme_reports(is_deleted) WHERE is_deleted = false;

-- Partial unique index to enforce uniqueness for active records only
CREATE UNIQUE INDEX IF NOT EXISTS idx_programme_reports_code_unique ON programme_reports(programme_id, report_code) WHERE is_deleted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_programme_reports_updated_at
    BEFORE UPDATE ON programme_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- REGISTER TABLES IN database_tables
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('programmes', 'Programme definitions for coordinating related projects', false, true, 'programme'),
  ('programme_projects', 'Project-to-programme assignments', false, true, 'programme'),
  ('programme_benefits', 'Benefits realization tracking for programmes', false, true, 'programme'),
  ('programme_members', 'Programme team members and roles', false, true, 'programme'),
  ('programme_governance', 'Programme governance structure and oversight', false, true, 'programme'),
  ('programme_milestones', 'Programme-level milestones and key events', false, true, 'programme'),
  ('programme_dependencies', 'Inter-project dependencies within programmes', false, true, 'programme'),
  ('programme_reports', 'Generated reports and dashboards for programmes', false, true, 'programme')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_governance ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_reports ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on your organization's security requirements
-- Example policies (commented out - customize as needed):
-- CREATE POLICY "Users can view programmes they are members of"
--   ON programmes FOR SELECT
--   USING (
--     is_deleted = false AND (
--       EXISTS (SELECT 1 FROM programme_members WHERE programme_id = programmes.id AND user_id = auth.uid() AND is_deleted = false)
--       OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'programme_manager'))
--     )
--   );

-- ================================================
-- End of v37_programme_management.sql
-- ================================================

