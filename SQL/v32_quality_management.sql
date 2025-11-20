-- ================================================
-- File: v32_quality_management.sql
-- Description: Quality Management module tables
-- Version: 1.1 (Added cleanup statements, fixed date calculation)
-- Date: 2025-01-17
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v31 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist

-- Purpose:
-- Creates tables for Quality Management module:
-- 1. quality_register - Central quality register
-- 2. quality_criteria_templates - Reusable quality criteria templates
-- 3. quality_reviews - Quality review planning and execution
-- 4. quality_review_participants - Review team members
-- 5. quality_inspections - Quality inspection records
-- 6. quality_defects - Defects and non-conformances
-- 7. quality_metrics - Quality metrics tracking

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS quality_metrics CASCADE;
DROP TABLE IF EXISTS quality_defects CASCADE;
DROP TABLE IF EXISTS quality_inspections CASCADE;
DROP TABLE IF EXISTS quality_review_participants CASCADE;
DROP TABLE IF EXISTS quality_reviews CASCADE;
DROP TABLE IF EXISTS quality_criteria_templates CASCADE;
DROP TABLE IF EXISTS quality_register CASCADE;

-- Drop views
DROP VIEW IF EXISTS quality_dashboard_summary CASCADE;

-- ================================================
-- TABLE 1: quality_register
-- Description: Central quality register for products/deliverables
-- Category: quality
-- ================================================

CREATE TABLE IF NOT EXISTS quality_register (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Product/Deliverable Information
    product_reference VARCHAR(100),
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT,
    product_type VARCHAR(100), -- 'document', 'software', 'hardware', 'service', 'report', 'other'
    product_category VARCHAR(100),

    -- Quality Information
    quality_method VARCHAR(100), -- 'review', 'inspection', 'testing', 'approval', 'audit'
    quality_responsibilities TEXT,
    quality_owner_user_id UUID REFERENCES users(id),

    -- Quality Criteria
    quality_criteria TEXT,
    acceptance_criteria TEXT,
    quality_standards TEXT[],
    compliance_requirements TEXT[],

    -- Quality Tolerance
    quality_tolerance_description TEXT,
    defect_tolerance INTEGER, -- Max acceptable defects

    -- Schedule
    quality_review_planned_date DATE,
    quality_review_actual_date DATE,
    sign_off_required BOOLEAN DEFAULT TRUE,
    sign_off_by_user_id UUID REFERENCES users(id),

    -- Status
    quality_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in-review', 'passed', 'failed', 'conditional', 'approved'
    sign_off_status VARCHAR(50), -- 'pending', 'signed-off', 'rejected'
    sign_off_date DATE,

    -- Outcomes
    quality_issues_found INTEGER DEFAULT 0,
    quality_score DECIMAL(5,2), -- 0-100
    pass_criteria_met BOOLEAN,

    -- Documents
    product_document_url TEXT,
    quality_plan_url TEXT,
    quality_report_url TEXT,

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
CREATE INDEX IF NOT EXISTS idx_quality_register_project_id ON quality_register(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_register_owner ON quality_register(quality_owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_register_status ON quality_register(quality_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_register_type ON quality_register(product_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_register_reference ON quality_register(product_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_register_updated_at ON quality_register;
CREATE TRIGGER trg_quality_register_updated_at
    BEFORE UPDATE ON quality_register
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: quality_criteria_templates
-- Description: Reusable quality criteria templates
-- Category: quality
-- ================================================

CREATE TABLE IF NOT EXISTS quality_criteria_templates (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template Information
    template_name VARCHAR(200) NOT NULL,
    template_description TEXT,
    template_category VARCHAR(100), -- 'document', 'software', 'deliverable', 'process'

    -- Criteria
    criteria_items JSONB, -- Array of criteria with name, description, weight
    acceptance_threshold DECIMAL(5,2), -- Minimum score to pass

    -- Applicability
    applicable_to_product_types TEXT[],
    methodology VARCHAR(50), -- 'structured', 'scrum', 'kanban', 'agile', 'all'

    -- Usage
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,

    -- Ownership
    owner_user_id UUID REFERENCES users(id),
    organization_id UUID, -- For organization-level templates

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
CREATE INDEX IF NOT EXISTS idx_quality_criteria_templates_category ON quality_criteria_templates(template_category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_criteria_templates_active ON quality_criteria_templates(is_active) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_criteria_templates_methodology ON quality_criteria_templates(methodology) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_criteria_templates_updated_at ON quality_criteria_templates;
CREATE TRIGGER trg_quality_criteria_templates_updated_at
    BEFORE UPDATE ON quality_criteria_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: quality_reviews
-- Description: Quality review planning and execution
-- Category: quality
-- ================================================

CREATE TABLE IF NOT EXISTS quality_reviews (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    quality_register_id UUID REFERENCES quality_register(id) ON DELETE SET NULL,
    criteria_template_id UUID REFERENCES quality_criteria_templates(id) ON DELETE SET NULL,

    -- Review Information
    review_reference VARCHAR(100),
    review_title VARCHAR(200) NOT NULL,
    review_type VARCHAR(100) DEFAULT 'peer-review', -- 'peer-review', 'management-review', 'technical-review', 'quality-audit', 'walk-through'
    review_scope TEXT,

    -- Schedule
    planned_date DATE,
    planned_duration_minutes INTEGER DEFAULT 60,
    actual_start_datetime TIMESTAMP,
    actual_end_datetime TIMESTAMP,

    -- Location
    review_location VARCHAR(200),
    review_location_type VARCHAR(50) DEFAULT 'virtual', -- 'in-person', 'virtual', 'hybrid'
    meeting_link TEXT,

    -- Review Chair/Lead
    chair_user_id UUID REFERENCES users(id),
    secretary_user_id UUID REFERENCES users(id),

    -- Preparation
    pre_review_checklist TEXT,
    materials_distribution_date DATE,
    preparation_required BOOLEAN DEFAULT TRUE,
    preparation_time_minutes INTEGER,

    -- Review Criteria
    review_criteria TEXT,
    checklist_items JSONB, -- Array of checklist items

    -- Outcomes
    review_status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in-progress', 'completed', 'cancelled'
    review_outcome VARCHAR(50), -- 'passed', 'passed-with-conditions', 'failed', 'deferred'
    outcome_summary TEXT,

    -- Scoring
    overall_score DECIMAL(5,2), -- 0-100
    pass_threshold DECIMAL(5,2) DEFAULT 70.00,
    criteria_met_count INTEGER DEFAULT 0,
    criteria_total_count INTEGER DEFAULT 0,

    -- Issues Found
    issues_found_count INTEGER DEFAULT 0,
    critical_issues_count INTEGER DEFAULT 0,
    major_issues_count INTEGER DEFAULT 0,
    minor_issues_count INTEGER DEFAULT 0,

    -- Actions Required
    corrective_actions_required BOOLEAN DEFAULT FALSE,
    follow_up_review_required BOOLEAN DEFAULT FALSE,
    follow_up_review_date DATE,

    -- Sign-off
    sign_off_required BOOLEAN DEFAULT TRUE,
    signed_off BOOLEAN DEFAULT FALSE,
    sign_off_by_user_id UUID REFERENCES users(id),
    sign_off_date DATE,

    -- Documents
    review_agenda_url TEXT,
    review_checklist_url TEXT,
    review_report_url TEXT,
    review_minutes_url TEXT,
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
CREATE INDEX IF NOT EXISTS idx_quality_reviews_project_id ON quality_reviews(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_reviews_register_id ON quality_reviews(quality_register_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_reviews_status ON quality_reviews(review_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_reviews_type ON quality_reviews(review_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_reviews_chair ON quality_reviews(chair_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_reviews_date ON quality_reviews(planned_date) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_reviews_updated_at ON quality_reviews;
CREATE TRIGGER trg_quality_reviews_updated_at
    BEFORE UPDATE ON quality_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: quality_review_participants
-- Description: Review team members and their roles
-- Category: quality
-- ================================================

CREATE TABLE IF NOT EXISTS quality_review_participants (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    review_id UUID NOT NULL REFERENCES quality_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Participant Role
    participant_role VARCHAR(100), -- 'reviewer', 'presenter', 'author', 'quality-assurance', 'subject-matter-expert', 'observer'
    responsibilities TEXT,

    -- Attendance
    attendance_status VARCHAR(50) DEFAULT 'invited', -- 'invited', 'accepted', 'declined', 'attended', 'absent'
    attendance_type VARCHAR(50), -- 'in-person', 'virtual'

    -- Preparation
    preparation_completed BOOLEAN DEFAULT FALSE,
    preparation_completion_date DATE,
    preparation_notes TEXT,

    -- Contribution
    comments_provided TEXT,
    findings_submitted INTEGER DEFAULT 0,

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
    CONSTRAINT quality_review_participants_unique UNIQUE (review_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_review_participants_review_id ON quality_review_participants(review_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_review_participants_user_id ON quality_review_participants(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_review_participants_role ON quality_review_participants(participant_role) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_review_participants_updated_at ON quality_review_participants;
CREATE TRIGGER trg_quality_review_participants_updated_at
    BEFORE UPDATE ON quality_review_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: quality_inspections
-- Description: Quality inspection records
-- Category: quality
-- ================================================

CREATE TABLE IF NOT EXISTS quality_inspections (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    quality_register_id UUID REFERENCES quality_register(id) ON DELETE SET NULL,

    -- Inspection Information
    inspection_reference VARCHAR(100),
    inspection_title VARCHAR(200) NOT NULL,
    inspection_type VARCHAR(100), -- 'process', 'product', 'documentation', 'compliance', 'safety'
    inspection_scope TEXT,

    -- Inspector
    inspector_user_id UUID REFERENCES users(id),
    inspection_team UUID[], -- Array of user IDs

    -- Schedule
    inspection_date DATE NOT NULL,
    inspection_start_time TIMESTAMP,
    inspection_end_time TIMESTAMP,
    inspection_duration_minutes INTEGER,

    -- Inspection Criteria
    inspection_criteria TEXT,
    inspection_checklist JSONB, -- Array of checklist items
    compliance_standards TEXT[],

    -- Findings
    findings_summary TEXT,
    conformances_count INTEGER DEFAULT 0,
    non_conformances_count INTEGER DEFAULT 0,
    observations_count INTEGER DEFAULT 0,

    -- Results
    inspection_result VARCHAR(50), -- 'passed', 'passed-with-observations', 'failed', 'incomplete'
    overall_conformance_percentage DECIMAL(5,2),

    -- Follow-up
    corrective_actions_required BOOLEAN DEFAULT FALSE,
    re_inspection_required BOOLEAN DEFAULT FALSE,
    re_inspection_date DATE,

    -- Sign-off
    inspection_completed BOOLEAN DEFAULT FALSE,
    completion_date DATE,
    approved_by_user_id UUID REFERENCES users(id),
    approval_date DATE,

    -- Documents
    inspection_report_url TEXT,
    evidence_urls TEXT[],
    photos_urls TEXT[],

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
CREATE INDEX IF NOT EXISTS idx_quality_inspections_project_id ON quality_inspections(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_inspections_register_id ON quality_inspections(quality_register_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_inspections_inspector ON quality_inspections(inspector_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_inspections_date ON quality_inspections(inspection_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_inspections_type ON quality_inspections(inspection_type) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_inspections_updated_at ON quality_inspections;
CREATE TRIGGER trg_quality_inspections_updated_at
    BEFORE UPDATE ON quality_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 6: quality_defects
-- Description: Defects and non-conformances
-- Category: quality
-- ================================================

CREATE TABLE IF NOT EXISTS quality_defects (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    quality_register_id UUID REFERENCES quality_register(id) ON DELETE SET NULL,
    quality_review_id UUID REFERENCES quality_reviews(id) ON DELETE SET NULL,
    quality_inspection_id UUID REFERENCES quality_inspections(id) ON DELETE SET NULL,

    -- Defect Information
    defect_reference VARCHAR(100) UNIQUE,
    defect_title VARCHAR(200) NOT NULL,
    defect_description TEXT NOT NULL,
    defect_type VARCHAR(100), -- 'functional', 'performance', 'usability', 'documentation', 'compliance', 'other'
    defect_category VARCHAR(100),

    -- Discovery
    discovered_by UUID REFERENCES users(id),
    discovery_date DATE NOT NULL,
    discovery_method VARCHAR(100), -- 'review', 'inspection', 'testing', 'user-feedback', 'audit'

    -- Severity & Priority
    severity VARCHAR(50) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low', 'cosmetic'
    priority VARCHAR(20) DEFAULT 'medium', -- 'urgent', 'high', 'medium', 'low'
    impact_description TEXT,

    -- Classification
    is_non_conformance BOOLEAN DEFAULT FALSE,
    affected_standard VARCHAR(200),
    regulatory_impact BOOLEAN DEFAULT FALSE,

    -- Root Cause
    root_cause_analysis TEXT,
    root_cause_category VARCHAR(100), -- 'process', 'people', 'technology', 'documentation', 'training', 'other'

    -- Resolution
    assigned_to_user_id UUID REFERENCES users(id),
    resolution_required_by_date DATE,
    resolution_description TEXT,
    corrective_action TEXT,
    preventive_action TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in-progress', 'resolved', 'verified', 'closed', 'deferred', 'wont-fix'
    resolution_date DATE,
    verification_required BOOLEAN DEFAULT TRUE,
    verified_by_user_id UUID REFERENCES users(id),
    verification_date DATE,
    closure_date DATE,

    -- Effort
    effort_hours DECIMAL(10,2),
    cost_to_fix DECIMAL(12,2),

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    related_defect_ids UUID[],

    -- Documents
    screenshot_urls TEXT[],
    evidence_urls TEXT[],
    resolution_document_url TEXT,

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
CREATE INDEX IF NOT EXISTS idx_quality_defects_project_id ON quality_defects(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_defects_register_id ON quality_defects(quality_register_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_defects_status ON quality_defects(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_defects_severity ON quality_defects(severity) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_defects_priority ON quality_defects(priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_defects_assigned_to ON quality_defects(assigned_to_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_defects_reference ON quality_defects(defect_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_defects_updated_at ON quality_defects;
CREATE TRIGGER trg_quality_defects_updated_at
    BEFORE UPDATE ON quality_defects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 7: quality_metrics
-- Description: Quality metrics tracking over time
-- Category: quality
-- ================================================

CREATE TABLE IF NOT EXISTS quality_metrics (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Metric Period
    metric_date DATE NOT NULL,
    metric_period VARCHAR(50) DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'quarterly', 'project-to-date'

    -- Quality Metrics
    total_reviews_conducted INTEGER DEFAULT 0,
    reviews_passed INTEGER DEFAULT 0,
    reviews_failed INTEGER DEFAULT 0,
    average_review_score DECIMAL(5,2),

    total_inspections_conducted INTEGER DEFAULT 0,
    inspections_passed INTEGER DEFAULT 0,
    inspections_failed INTEGER DEFAULT 0,
    average_conformance_rate DECIMAL(5,2),

    -- Defect Metrics
    defects_opened INTEGER DEFAULT 0,
    defects_closed INTEGER DEFAULT 0,
    defects_open_total INTEGER DEFAULT 0,
    critical_defects_open INTEGER DEFAULT 0,
    high_defects_open INTEGER DEFAULT 0,

    -- Defect Density
    defects_per_deliverable DECIMAL(10,2),
    defect_detection_rate DECIMAL(5,2),
    defect_escape_rate DECIMAL(5,2),

    -- Resolution Metrics
    average_resolution_time_days DECIMAL(10,2),
    first_time_pass_rate DECIMAL(5,2),
    rework_percentage DECIMAL(5,2),

    -- Cost of Quality
    cost_of_prevention DECIMAL(12,2),
    cost_of_appraisal DECIMAL(12,2),
    cost_of_internal_failure DECIMAL(12,2),
    cost_of_external_failure DECIMAL(12,2),
    total_cost_of_quality DECIMAL(12,2),

    -- Compliance
    compliance_rate DECIMAL(5,2),
    non_conformances_count INTEGER DEFAULT 0,

    -- Trends
    trend_direction VARCHAR(50), -- 'improving', 'stable', 'declining'
    trend_notes TEXT,

    -- Calculated Fields
    calculated_at TIMESTAMP,

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
CREATE INDEX IF NOT EXISTS idx_quality_metrics_project_id ON quality_metrics(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_metrics_date ON quality_metrics(metric_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_quality_metrics_period ON quality_metrics(metric_period) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_metrics_updated_at ON quality_metrics;
CREATE TRIGGER trg_quality_metrics_updated_at
    BEFORE UPDATE ON quality_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- VIEW: quality_dashboard_summary
-- Description: Summary view for quality dashboard
-- ================================================

CREATE OR REPLACE VIEW quality_dashboard_summary AS
SELECT
    p.id as project_id,
    p.project_name,
    COUNT(DISTINCT qr.id) as total_products,
    COUNT(DISTINCT qrev.id) as total_reviews,
    SUM(CASE WHEN qrev.review_outcome = 'passed' THEN 1 ELSE 0 END) as reviews_passed,
    AVG(qrev.overall_score) as average_review_score,
    COUNT(DISTINCT qi.id) as total_inspections,
    SUM(CASE WHEN qi.inspection_result = 'passed' THEN 1 ELSE 0 END) as inspections_passed,
    COUNT(DISTINCT qd.id) as total_defects,
    SUM(CASE WHEN qd.status IN ('open', 'in-progress') THEN 1 ELSE 0 END) as open_defects,
    SUM(CASE WHEN qd.severity = 'critical' AND qd.status IN ('open', 'in-progress') THEN 1 ELSE 0 END) as critical_defects_open,
    AVG(CASE WHEN qd.status = 'closed' THEN (qd.closure_date - qd.discovery_date) END) as avg_resolution_days
FROM projects p
LEFT JOIN quality_register qr ON p.id = qr.project_id AND qr.is_deleted = FALSE
LEFT JOIN quality_reviews qrev ON p.id = qrev.project_id AND qrev.is_deleted = FALSE
LEFT JOIN quality_inspections qi ON p.id = qi.project_id AND qi.is_deleted = FALSE
LEFT JOIN quality_defects qd ON p.id = qd.project_id AND qd.is_deleted = FALSE
GROUP BY p.id, p.project_name;

-- ================================================
-- Register Tables in database_tables Registry
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('quality_register', 'Central quality register for products and deliverables', false, true),
  ('quality_criteria_templates', 'Reusable quality criteria templates', false, true),
  ('quality_reviews', 'Quality review planning, execution, and outcomes', false, true),
  ('quality_review_participants', 'Quality review team members and their roles', false, true),
  ('quality_inspections', 'Quality inspection records and results', false, true),
  ('quality_defects', 'Defects, non-conformances, and quality issues tracking', false, true),
  ('quality_metrics', 'Quality metrics tracking and trending over time', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ================================================
-- End of v32_quality_management.sql
-- ================================================
