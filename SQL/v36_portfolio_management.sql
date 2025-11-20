-- ================================================
-- File: v36_portfolio_management.sql
-- Description: Portfolio Management module tables
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v35 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist

-- Purpose:
-- Creates tables for Portfolio Management module:
-- 1. portfolios - Portfolio definitions
-- 2. portfolio_projects - Project-to-portfolio assignments
-- 3. portfolio_objectives - Strategic objectives for portfolios
-- 4. portfolio_members - Portfolio team members
-- 5. portfolio_governance - Portfolio governance and oversight
-- 6. portfolio_metrics - Portfolio-level performance metrics
-- 7. portfolio_risks - Portfolio-level risk aggregation
-- 8. portfolio_budgets - Portfolio budget tracking
-- 9. portfolio_reports - Portfolio reporting

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS portfolio_reports CASCADE;
DROP TABLE IF EXISTS portfolio_budgets CASCADE;
DROP TABLE IF EXISTS portfolio_risks CASCADE;
DROP TABLE IF EXISTS portfolio_metrics CASCADE;
DROP TABLE IF EXISTS portfolio_governance CASCADE;
DROP TABLE IF EXISTS portfolio_members CASCADE;
DROP TABLE IF EXISTS portfolio_objectives CASCADE;
DROP TABLE IF EXISTS portfolio_projects CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;

-- ================================================
-- TABLE 1: portfolios
-- Description: Portfolio definitions
-- Category: portfolio
-- ================================================

CREATE TABLE IF NOT EXISTS portfolios (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Portfolio Information
    portfolio_code VARCHAR(100) UNIQUE,
    portfolio_name VARCHAR(200) NOT NULL,
    portfolio_description TEXT,
    portfolio_vision TEXT,
    
    -- Portfolio Classification
    portfolio_type VARCHAR(100), -- 'strategic', 'operational', 'innovation', 'compliance', 'mixed'
    portfolio_category VARCHAR(100), -- 'it', 'business', 'infrastructure', 'product', 'research'
    
    -- Portfolio Owner
    portfolio_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    portfolio_manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Portfolio Lifecycle
    portfolio_start_date DATE,
    portfolio_end_date DATE,
    portfolio_status VARCHAR(50) DEFAULT 'active', -- 'planning', 'active', 'on-hold', 'completed', 'cancelled'
    
    -- Portfolio Hierarchy (for nested portfolios)
    parent_portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    portfolio_level INTEGER DEFAULT 1, -- 1=Top level, 2=Sub-portfolio, etc.
    
    -- Strategic Alignment
    strategic_alignment_score DECIMAL(5,2), -- 0-100
    strategic_alignment_notes TEXT,
    
    -- Portfolio Goals
    portfolio_goals TEXT,
    success_criteria TEXT,
    key_performance_indicators TEXT[],
    
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
    
    -- Portfolio Metrics (calculated fields, updated via triggers/functions)
    total_projects_count INTEGER DEFAULT 0,
    active_projects_count INTEGER DEFAULT 0,
    completed_projects_count INTEGER DEFAULT 0,
    on_hold_projects_count INTEGER DEFAULT 0,
    cancelled_projects_count INTEGER DEFAULT 0,
    
    overall_health_score DECIMAL(5,2), -- 0-100
    average_project_health DECIMAL(5,2), -- 0-100
    resource_utilization_percentage DECIMAL(5,2), -- 0-100
    schedule_adherence_percentage DECIMAL(5,2), -- 0-100
    budget_adherence_percentage DECIMAL(5,2), -- 0-100
    
    -- Risk Aggregation
    total_risks_count INTEGER DEFAULT 0,
    high_risks_count INTEGER DEFAULT 0,
    risk_exposure_score DECIMAL(5,2), -- 0-100
    
    -- Tags and Metadata
    tags TEXT[],
    custom_fields JSONB,
    
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
CREATE INDEX IF NOT EXISTS idx_portfolios_code ON portfolios(portfolio_code) WHERE is_deleted = FALSE AND portfolio_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portfolios_owner ON portfolios(portfolio_owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolios_manager ON portfolios(portfolio_manager_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON portfolios(portfolio_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolios_type ON portfolios(portfolio_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolios_parent ON portfolios(parent_portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolios_level ON portfolios(portfolio_level) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolios_updated_at ON portfolios;
CREATE TRIGGER trg_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- TABLE 2: portfolio_projects
-- Description: Project-to-portfolio assignments
-- Category: portfolio
-- ================================================

CREATE TABLE IF NOT EXISTS portfolio_projects (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Assignment Information
    assignment_date DATE DEFAULT CURRENT_DATE,
    assignment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'proposed', 'pending', 'removed'
    assignment_reason TEXT,
    
    -- Project Priority in Portfolio
    portfolio_priority VARCHAR(50), -- 'critical', 'high', 'medium', 'low'
    priority_order INTEGER, -- For sorting within portfolio
    is_strategic_project BOOLEAN DEFAULT FALSE,
    
    -- Resource Allocation (from portfolio perspective)
    allocated_budget_from_portfolio DECIMAL(15,2),
    allocated_resources_from_portfolio JSONB, -- Array of resource allocations
    
    -- Portfolio Contribution
    contribution_to_portfolio_goals TEXT,
    expected_benefits TEXT,
    
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
    CONSTRAINT portfolio_projects_unique UNIQUE (portfolio_id, project_id, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_portfolio_id ON portfolio_projects(portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_project_id ON portfolio_projects(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_status ON portfolio_projects(assignment_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_priority ON portfolio_projects(portfolio_priority) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolio_projects_updated_at ON portfolio_projects;
CREATE TRIGGER trg_portfolio_projects_updated_at
    BEFORE UPDATE ON portfolio_projects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- TABLE 3: portfolio_objectives
-- Description: Strategic objectives for portfolios
-- Category: portfolio
-- ================================================

CREATE TABLE IF NOT EXISTS portfolio_objectives (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    parent_objective_id UUID REFERENCES portfolio_objectives(id) ON DELETE SET NULL, -- For objective hierarchy
    
    -- Objective Information
    objective_code VARCHAR(100),
    objective_name VARCHAR(200) NOT NULL,
    objective_description TEXT,
    objective_type VARCHAR(100), -- 'strategic', 'tactical', 'operational', 'financial', 'customer'
    
    -- Objective Hierarchy
    objective_level INTEGER DEFAULT 1, -- 1=Top level, 2=Sub-objective, etc.
    
    -- Measurement
    measurement_criteria TEXT,
    target_value DECIMAL(15,2),
    current_value DECIMAL(15,2),
    measurement_unit VARCHAR(50),
    measurement_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    
    -- Target Dates
    target_start_date DATE,
    target_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Status
    objective_status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in-progress', 'achieved', 'at-risk', 'failed'
    completion_percentage DECIMAL(5,2) DEFAULT 0, -- 0-100
    
    -- Alignment
    aligned_with_strategic_goals TEXT[],
    strategic_importance_score INTEGER CHECK (strategic_importance_score >= 1 AND strategic_importance_score <= 5), -- 1=Low, 5=High
    
    -- Owner
    objective_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
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
CREATE INDEX IF NOT EXISTS idx_portfolio_objectives_portfolio_id ON portfolio_objectives(portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_objectives_parent ON portfolio_objectives(parent_objective_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_objectives_status ON portfolio_objectives(objective_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_objectives_owner ON portfolio_objectives(objective_owner_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolio_objectives_updated_at ON portfolio_objectives;
CREATE TRIGGER trg_portfolio_objectives_updated_at
    BEFORE UPDATE ON portfolio_objectives
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- TABLE 4: portfolio_members
-- Description: Portfolio team members and roles
-- Category: portfolio
-- ================================================

CREATE TABLE IF NOT EXISTS portfolio_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role Information
    member_role VARCHAR(100) NOT NULL, -- 'portfolio_manager', 'portfolio_owner', 'portfolio_analyst', 'stakeholder', 'reviewer'
    role_description TEXT,
    
    -- Assignment Information
    assignment_start_date DATE,
    assignment_end_date DATE,
    assignment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'pending', 'inactive', 'completed'
    
    -- Permissions & Responsibilities
    can_view_all_projects BOOLEAN DEFAULT FALSE,
    can_edit_portfolio BOOLEAN DEFAULT FALSE,
    can_assign_projects BOOLEAN DEFAULT FALSE,
    can_review_portfolio BOOLEAN DEFAULT FALSE,
    responsibilities TEXT[],
    
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
    CONSTRAINT portfolio_members_unique UNIQUE (portfolio_id, user_id, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_members_portfolio_id ON portfolio_members(portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_members_user_id ON portfolio_members(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_members_role ON portfolio_members(member_role) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_members_status ON portfolio_members(assignment_status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolio_members_updated_at ON portfolio_members;
CREATE TRIGGER trg_portfolio_members_updated_at
    BEFORE UPDATE ON portfolio_members
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- TABLE 5: portfolio_governance
-- Description: Portfolio governance and oversight
-- Category: portfolio
-- ================================================

CREATE TABLE IF NOT EXISTS portfolio_governance (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    
    -- Governance Structure
    governance_board_name VARCHAR(200),
    governance_model VARCHAR(100), -- 'centralized', 'decentralized', 'hybrid', 'federated'
    decision_making_process TEXT,
    
    -- Governance Meetings
    review_meeting_frequency VARCHAR(50), -- 'weekly', 'bi-weekly', 'monthly', 'quarterly'
    last_review_meeting_date DATE,
    next_review_meeting_date DATE,
    review_meeting_duration_minutes INTEGER,
    
    -- Decision Authority
    project_approval_authority TEXT,
    budget_approval_authority TEXT,
    resource_allocation_authority TEXT,
    
    -- Governance Rules
    project_selection_criteria TEXT,
    project_prioritization_rules TEXT,
    resource_allocation_rules TEXT,
    project_cancellation_criteria TEXT,
    
    -- Escalation
    escalation_process TEXT,
    escalation_contacts JSONB, -- Array of escalation contact objects
    
    -- Compliance
    compliance_requirements TEXT[],
    compliance_review_frequency VARCHAR(50),
    last_compliance_review_date DATE,
    next_compliance_review_date DATE,
    
    -- Governance Metrics
    governance_effectiveness_score DECIMAL(5,2), -- 0-100
    decision_velocity_days DECIMAL(10,2), -- Average days to make decisions
    review_completion_rate DECIMAL(5,2), -- Percentage of scheduled reviews completed
    
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
    CONSTRAINT portfolio_governance_unique UNIQUE (portfolio_id, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_governance_portfolio_id ON portfolio_governance(portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_governance_next_review ON portfolio_governance(next_review_meeting_date) WHERE is_deleted = FALSE AND next_review_meeting_date IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolio_governance_updated_at ON portfolio_governance;
CREATE TRIGGER trg_portfolio_governance_updated_at
    BEFORE UPDATE ON portfolio_governance
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- TABLE 6: portfolio_metrics
-- Description: Portfolio-level performance metrics
-- Category: portfolio
-- ================================================

CREATE TABLE IF NOT EXISTS portfolio_metrics (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    
    -- Metric Period
    metric_period_start_date DATE NOT NULL,
    metric_period_end_date DATE NOT NULL,
    metric_period_type VARCHAR(50) DEFAULT 'month', -- 'day', 'week', 'month', 'quarter', 'year'
    
    -- Project Counts
    total_projects INTEGER DEFAULT 0,
    active_projects INTEGER DEFAULT 0,
    completed_projects INTEGER DEFAULT 0,
    on_hold_projects INTEGER DEFAULT 0,
    cancelled_projects INTEGER DEFAULT 0,
    
    -- Projects by Methodology
    structured_pm_projects INTEGER DEFAULT 0,
    scrum_projects INTEGER DEFAULT 0,
    kanban_projects INTEGER DEFAULT 0,
    hybrid_projects INTEGER DEFAULT 0,
    
    -- Projects by Status
    on_track_projects INTEGER DEFAULT 0,
    at_risk_projects INTEGER DEFAULT 0,
    off_track_projects INTEGER DEFAULT 0,
    
    -- Portfolio Health
    overall_health_score DECIMAL(5,2), -- 0-100
    average_project_health DECIMAL(5,2), -- 0-100
    
    -- Financial Metrics
    total_budget DECIMAL(15,2),
    allocated_budget DECIMAL(15,2),
    spent_budget DECIMAL(15,2),
    remaining_budget DECIMAL(15,2) GENERATED ALWAYS AS (total_budget - spent_budget) STORED,
    budget_utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_budget > 0 THEN (spent_budget / total_budget * 100)
            ELSE 0
        END
    ) STORED,
    budget_variance DECIMAL(15,2) GENERATED ALWAYS AS (spent_budget - allocated_budget) STORED,
    
    -- Resource Metrics
    total_resources_count INTEGER DEFAULT 0,
    allocated_resources_count INTEGER DEFAULT 0,
    resource_utilization_percentage DECIMAL(5,2), -- 0-100
    over_allocated_resources_count INTEGER DEFAULT 0,
    
    -- Schedule Metrics
    average_schedule_adherence DECIMAL(5,2), -- 0-100
    on_time_projects_count INTEGER DEFAULT 0,
    delayed_projects_count INTEGER DEFAULT 0,
    
    -- Risk Metrics
    total_risks_count INTEGER DEFAULT 0,
    high_risks_count INTEGER DEFAULT 0,
    medium_risks_count INTEGER DEFAULT 0,
    low_risks_count INTEGER DEFAULT 0,
    risk_exposure_score DECIMAL(5,2), -- 0-100
    
    -- Issue Metrics
    total_issues_count INTEGER DEFAULT 0,
    open_issues_count INTEGER DEFAULT 0,
    resolved_issues_count INTEGER DEFAULT 0,
    critical_issues_count INTEGER DEFAULT 0,
    
    -- Quality Metrics
    average_quality_score DECIMAL(5,2), -- 0-100
    quality_reviews_completed INTEGER DEFAULT 0,
    quality_reviews_pending INTEGER DEFAULT 0,
    
    -- Benefits Realization (if applicable)
    total_expected_benefits DECIMAL(15,2),
    realized_benefits DECIMAL(15,2),
    benefits_realization_percentage DECIMAL(5,2),
    
    -- Calculated At
    calculated_at TIMESTAMP DEFAULT NOW(),
    
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
    CONSTRAINT portfolio_metrics_dates_check CHECK (metric_period_start_date <= metric_period_end_date),
    CONSTRAINT portfolio_metrics_unique_period UNIQUE (portfolio_id, metric_period_start_date, metric_period_end_date, metric_period_type, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_portfolio_id ON portfolio_metrics(portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_period ON portfolio_metrics(metric_period_start_date, metric_period_end_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_calculated_at ON portfolio_metrics(calculated_at DESC) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolio_metrics_updated_at ON portfolio_metrics;
CREATE TRIGGER trg_portfolio_metrics_updated_at
    BEFORE UPDATE ON portfolio_metrics
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- TABLE 7: portfolio_risks
-- Description: Portfolio-level risk aggregation
-- Category: portfolio
-- ================================================

CREATE TABLE IF NOT EXISTS portfolio_risks (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Risk originated from this project
    source_risk_id UUID, -- Reference to original risk record (polymorphic - could be from risks table)
    
    -- Risk Information
    risk_code VARCHAR(100),
    risk_title VARCHAR(200) NOT NULL,
    risk_description TEXT,
    risk_category VARCHAR(100), -- 'strategic', 'operational', 'financial', 'technical', 'regulatory', 'reputational'
    
    -- Risk Assessment
    probability_level INTEGER CHECK (probability_level >= 1 AND probability_level <= 5), -- 1=Very Low, 5=Very High
    impact_level INTEGER CHECK (impact_level >= 1 AND impact_level <= 5), -- 1=Very Low, 5=Very High
    risk_score INTEGER GENERATED ALWAYS AS (probability_level * impact_level) STORED, -- 1-25
    risk_rating VARCHAR(50) GENERATED ALWAYS AS (
        CASE 
            WHEN (probability_level * impact_level) >= 16 THEN 'critical'
            WHEN (probability_level * impact_level) >= 9 THEN 'high'
            WHEN (probability_level * impact_level) >= 4 THEN 'medium'
            ELSE 'low'
        END
    ) STORED,
    
    -- Risk Impact
    impact_description TEXT,
    potential_cost_impact DECIMAL(15,2),
    potential_schedule_impact_days INTEGER,
    affected_projects UUID[], -- Array of project IDs affected
    
    -- Risk Response
    response_strategy VARCHAR(100), -- 'avoid', 'mitigate', 'transfer', 'accept', 'exploit'
    response_plan TEXT,
    response_owner_user_id UUID REFERENCES users(id),
    response_due_date DATE,
    
    -- Risk Status
    risk_status VARCHAR(50) DEFAULT 'identified', -- 'identified', 'assessed', 'responding', 'monitored', 'closed'
    residual_risk_score INTEGER, -- Risk score after mitigation
    
    -- Monitoring
    monitoring_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'quarterly'
    last_reviewed_date DATE,
    next_review_date DATE,
    
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
CREATE INDEX IF NOT EXISTS idx_portfolio_risks_portfolio_id ON portfolio_risks(portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_risks_source_project ON portfolio_risks(source_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_risks_rating ON portfolio_risks(risk_rating) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_risks_status ON portfolio_risks(risk_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_risks_score ON portfolio_risks(risk_score) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolio_risks_updated_at ON portfolio_risks;
CREATE TRIGGER trg_portfolio_risks_updated_at
    BEFORE UPDATE ON portfolio_risks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- TABLE 8: portfolio_budgets
-- Description: Portfolio budget tracking
-- Category: portfolio
-- ================================================

CREATE TABLE IF NOT EXISTS portfolio_budgets (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    
    -- Budget Information
    budget_name VARCHAR(200) NOT NULL,
    budget_description TEXT,
    budget_type VARCHAR(100), -- 'total', 'operational', 'capital', 'contingency', 'project-specific'
    budget_category VARCHAR(100), -- For further categorization
    
    -- Budget Period
    budget_year INTEGER,
    budget_quarter INTEGER CHECK (budget_quarter >= 1 AND budget_quarter <= 4),
    budget_start_date DATE,
    budget_end_date DATE,
    
    -- Budget Amounts
    approved_budget DECIMAL(15,2) NOT NULL,
    allocated_budget DECIMAL(15,2) DEFAULT 0,
    committed_budget DECIMAL(15,2) DEFAULT 0,
    spent_budget DECIMAL(15,2) DEFAULT 0,
    remaining_budget DECIMAL(15,2) GENERATED ALWAYS AS (approved_budget - spent_budget) STORED,
    
    -- Budget Utilization
    utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN approved_budget > 0 THEN (spent_budget / approved_budget * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Budget Variance
    variance_amount DECIMAL(15,2) GENERATED ALWAYS AS (spent_budget - allocated_budget) STORED,
    variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN allocated_budget > 0 THEN ((spent_budget - allocated_budget) / allocated_budget * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Currency
    currency_code VARCHAR(3) DEFAULT 'USD',
    
    -- Budget Status
    budget_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'active', 'closed', 'cancelled'
    
    -- Approval
    approval_status VARCHAR(50), -- 'pending', 'approved', 'rejected', 'requires-revision'
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Owner
    budget_owner_user_id UUID REFERENCES users(id),
    
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
    CONSTRAINT portfolio_budgets_dates_check CHECK (budget_end_date IS NULL OR budget_start_date <= budget_end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_budgets_portfolio_id ON portfolio_budgets(portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_budgets_year_quarter ON portfolio_budgets(budget_year, budget_quarter) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_budgets_status ON portfolio_budgets(budget_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_budgets_period ON portfolio_budgets(budget_start_date, budget_end_date) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolio_budgets_updated_at ON portfolio_budgets;
CREATE TRIGGER trg_portfolio_budgets_updated_at
    BEFORE UPDATE ON portfolio_budgets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- TABLE 9: portfolio_reports
-- Description: Portfolio reporting
-- Category: portfolio
-- ================================================

CREATE TABLE IF NOT EXISTS portfolio_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    report_template_id UUID, -- Reference to report template (if applicable)
    
    -- Report Information
    report_name VARCHAR(200) NOT NULL,
    report_description TEXT,
    report_type VARCHAR(100), -- 'executive-summary', 'health-dashboard', 'financial', 'risk', 'resource', 'custom'
    report_category VARCHAR(100),
    
    -- Report Period
    report_period_start_date DATE,
    report_period_end_date DATE,
    report_date DATE DEFAULT CURRENT_DATE,
    
    -- Report Generation
    generation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
    generated_at TIMESTAMP,
    generated_by_user_id UUID REFERENCES users(id),
    
    -- Report Content
    report_data JSONB, -- Structured report data
    report_summary TEXT,
    key_highlights TEXT[],
    key_metrics JSONB,
    
    -- Report Distribution
    distribution_list UUID[], -- Array of user IDs
    distribution_method VARCHAR(100), -- 'email', 'portal', 'download', 'print'
    distributed_at TIMESTAMP,
    distributed_by_user_id UUID REFERENCES users(id),
    
    -- Report Access
    is_public BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(50), -- 'portfolio_members', 'stakeholders', 'executives', 'public'
    
    -- Report File
    report_file_url TEXT,
    report_file_format VARCHAR(50), -- 'pdf', 'excel', 'html', 'json'
    file_size_bytes BIGINT,
    
    -- Schedule (for automated reports)
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_frequency VARCHAR(50), -- 'daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly'
    next_scheduled_date DATE,
    last_scheduled_date DATE,
    
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
    CONSTRAINT portfolio_reports_dates_check CHECK (report_period_end_date IS NULL OR report_period_start_date <= report_period_end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_reports_portfolio_id ON portfolio_reports(portfolio_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_reports_type ON portfolio_reports(report_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_reports_date ON portfolio_reports(report_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_reports_status ON portfolio_reports(generation_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_portfolio_reports_period ON portfolio_reports(report_period_start_date, report_period_end_date) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolio_reports_updated_at ON portfolio_reports;
CREATE TRIGGER trg_portfolio_reports_updated_at
    BEFORE UPDATE ON portfolio_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- Register Tables in database_tables Registry
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('portfolios', 'Portfolio definitions and configuration', false, true, 'portfolio'),
  ('portfolio_projects', 'Project-to-portfolio assignments', false, true, 'portfolio'),
  ('portfolio_objectives', 'Strategic objectives for portfolios', false, true, 'portfolio'),
  ('portfolio_members', 'Portfolio team members and roles', false, true, 'portfolio'),
  ('portfolio_governance', 'Portfolio governance and oversight', false, true, 'portfolio'),
  ('portfolio_metrics', 'Portfolio-level performance metrics', false, true, 'portfolio'),
  ('portfolio_risks', 'Portfolio-level risk aggregation', false, true, 'portfolio'),
  ('portfolio_budgets', 'Portfolio budget tracking', false, true, 'portfolio'),
  ('portfolio_reports', 'Portfolio reporting', false, true, 'portfolio')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE portfolios IS 'Portfolio definitions and configuration for strategic project management';
COMMENT ON TABLE portfolio_projects IS 'Assignments of projects to portfolios with priority and resource allocation';
COMMENT ON TABLE portfolio_objectives IS 'Strategic objectives for portfolios with measurement and tracking';
COMMENT ON TABLE portfolio_members IS 'Portfolio team members with roles and permissions';
COMMENT ON TABLE portfolio_governance IS 'Portfolio governance structure, rules, and oversight processes';
COMMENT ON TABLE portfolio_metrics IS 'Portfolio-level performance metrics tracked over time';
COMMENT ON TABLE portfolio_risks IS 'Portfolio-level risk aggregation and management';
COMMENT ON TABLE portfolio_budgets IS 'Portfolio budget tracking and variance analysis';
COMMENT ON TABLE portfolio_reports IS 'Portfolio reports and automated reporting';

-- ================================================
-- End of v36_portfolio_management.sql
-- ================================================

