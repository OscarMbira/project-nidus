-- ================================================
-- End Project Report CRUD Enhancement
-- SQL Version: v192
-- Date: 2026-01-20
-- Related: v30_closing_project.sql (existing end_project_reports table)
-- ================================================

-- ================================================
-- ENUM TYPE DEFINITIONS
-- ================================================

-- Closure Type Enum
DO $$ BEGIN
    CREATE TYPE epr_closure_type_enum AS ENUM ('normal', 'early-termination', 'premature', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Approval Status Enum
DO $$ BEGIN
    CREATE TYPE epr_approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Distribution Status Enum
DO $$ BEGIN
    CREATE TYPE epr_distribution_status_enum AS ENUM ('sent', 'read', 'acknowledged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Benefit Type Enum
DO $$ BEGIN
    CREATE TYPE epr_benefit_type_enum AS ENUM ('achieved', 'residual', 'expected_net', 'not_achieved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Objective Area Enum
DO $$ BEGIN
    CREATE TYPE epr_objective_area_enum AS ENUM ('time', 'cost', 'quality', 'scope', 'benefits', 'risk');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Performance Rating Enum
DO $$ BEGIN
    CREATE TYPE epr_performance_rating_enum AS ENUM ('exceeded', 'met', 'partially_met', 'not_met');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Team Performance Type Enum
DO $$ BEGIN
    CREATE TYPE epr_performance_type_enum AS ENUM ('recognition', 'achievement', 'improvement', 'observation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Recognition Category Enum
DO $$ BEGIN
    CREATE TYPE epr_recognition_category_enum AS ENUM ('leadership', 'technical', 'collaboration', 'innovation', 'delivery', 'quality', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Quality Activity Type Enum
DO $$ BEGIN
    CREATE TYPE epr_quality_activity_type_enum AS ENUM ('review', 'inspection', 'test', 'audit', 'walkthrough', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Quality Activity Status Enum
DO $$ BEGIN
    CREATE TYPE epr_quality_activity_status_enum AS ENUM ('planned', 'completed', 'cancelled', 'not_required');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Quality Activity Result Enum
DO $$ BEGIN
    CREATE TYPE epr_quality_activity_result_enum AS ENUM ('passed', 'failed', 'passed_with_conditions', 'not_applicable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Product Approval Status Enum
DO $$ BEGIN
    CREATE TYPE epr_product_approval_status_enum AS ENUM ('approved', 'conditionally_approved', 'rejected', 'pending', 'deferred');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Off-Spec Type Enum
DO $$ BEGIN
    CREATE TYPE epr_off_spec_type_enum AS ENUM ('missing_product', 'non_conforming', 'partial_delivery', 'quality_deviation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lesson Type Enum
DO $$ BEGIN
    CREATE TYPE epr_lesson_type_enum AS ENUM ('what_went_well', 'what_went_badly', 'recommendation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lesson Category Enum
DO $$ BEGIN
    CREATE TYPE epr_lesson_category_enum AS ENUM ('process', 'people', 'technology', 'planning', 'execution', 'risk', 'quality', 'stakeholder', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lesson Impact Enum
DO $$ BEGIN
    CREATE TYPE epr_lesson_impact_enum AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lesson Target Audience Enum
DO $$ BEGIN
    CREATE TYPE epr_lesson_target_audience_enum AS ENUM ('project', 'programme', 'corporate', 'industry');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Follow-On Source Type Enum
DO $$ BEGIN
    CREATE TYPE epr_follow_on_source_type_enum AS ENUM ('open_issue', 'open_risk', 'unfinished_work', 'recommendation', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Quality Check Validation Status Enum
DO $$ BEGIN
    CREATE TYPE epr_quality_check_status_enum AS ENUM ('not_checked', 'passed', 'failed', 'needs_review', 'manual_override');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================
-- ENHANCE EXISTING TABLE: end_project_reports
-- ================================================

-- Add new columns to end_project_reports
ALTER TABLE end_project_reports
ADD COLUMN IF NOT EXISTS version_no VARCHAR(20) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS document_ref VARCHAR(100),
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS date_of_this_revision DATE,
ADD COLUMN IF NOT EXISTS date_of_next_revision DATE,
ADD COLUMN IF NOT EXISTS project_managers_report TEXT,
ADD COLUMN IF NOT EXISTS abnormal_situations TEXT,
ADD COLUMN IF NOT EXISTS abnormal_situations_impact TEXT,
ADD COLUMN IF NOT EXISTS premature_closure_reason TEXT,
ADD COLUMN IF NOT EXISTS project_assurance_agreement BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS project_assurance_notes TEXT,
ADD COLUMN IF NOT EXISTS closure_type epr_closure_type_enum DEFAULT 'normal';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_end_project_reports_document_ref ON end_project_reports(document_ref) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_project_reports_author_id ON end_project_reports(author_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_project_reports_closure_type ON end_project_reports(closure_type) WHERE is_deleted = FALSE;

-- ================================================
-- TABLE 1: end_project_report_revision_history
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL,
    previous_revision_date DATE,
    summary_of_changes TEXT,
    changes_marked TEXT,
    revised_by UUID REFERENCES users(id),
    version_no VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_revision_history_report_id ON end_project_report_revision_history(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_revision_history_revision_date ON end_project_report_revision_history(revision_date);

COMMENT ON TABLE end_project_report_revision_history IS 'Revision history for End Project Reports';

-- ================================================
-- TABLE 2: end_project_report_approvals
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_name VARCHAR(200),
    approver_title VARCHAR(200),
    signature_data TEXT,
    approval_date DATE,
    approval_status epr_approval_status_enum DEFAULT 'pending',
    comments TEXT,
    version_approved VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_approvals_report_id ON end_project_report_approvals(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_approvals_approver_id ON end_project_report_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_epr_approvals_status ON end_project_report_approvals(approval_status);

COMMENT ON TABLE end_project_report_approvals IS 'Approval workflow for End Project Reports';

-- ================================================
-- TABLE 3: end_project_report_distribution
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id),
    recipient_name VARCHAR(200),
    recipient_title VARCHAR(200),
    date_of_issue DATE NOT NULL,
    version_distributed VARCHAR(20),
    distribution_status epr_distribution_status_enum DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_distribution_report_id ON end_project_report_distribution(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_distribution_recipient_id ON end_project_report_distribution(recipient_id);
CREATE INDEX IF NOT EXISTS idx_epr_distribution_status ON end_project_report_distribution(distribution_status);

COMMENT ON TABLE end_project_report_distribution IS 'Distribution list for End Project Reports';

-- ================================================
-- TABLE 4: end_project_report_business_case_review
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_business_case_review (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    business_case_id UUID REFERENCES business_cases(id) ON DELETE SET NULL,
    benefit_id UUID,
    benefit_description TEXT NOT NULL,
    benefit_type epr_benefit_type_enum NOT NULL,
    original_target_value DECIMAL(15,2),
    actual_value DECIMAL(15,2),
    variance DECIMAL(15,2),
    variance_percentage DECIMAL(5,2),
    measurement_unit VARCHAR(50),
    realization_date DATE,
    is_post_project BOOLEAN DEFAULT FALSE,
    deviation_description TEXT,
    deviation_reason TEXT,
    owner_id UUID REFERENCES users(id),
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_bc_review_report_id ON end_project_report_business_case_review(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_bc_review_business_case_id ON end_project_report_business_case_review(business_case_id);
CREATE INDEX IF NOT EXISTS idx_epr_bc_review_benefit_id ON end_project_report_business_case_review(benefit_id);
CREATE INDEX IF NOT EXISTS idx_epr_bc_review_type ON end_project_report_business_case_review(benefit_type);

COMMENT ON TABLE end_project_report_business_case_review IS 'Business Case benefits review for End Project Reports';

-- ================================================
-- TABLE 5: end_project_report_objectives_review
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_objectives_review (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    objective_area epr_objective_area_enum NOT NULL,
    objective_description TEXT NOT NULL,
    original_target TEXT,
    tolerance_plus DECIMAL(15,2),
    tolerance_minus DECIMAL(15,2),
    actual_value TEXT,
    variance DECIMAL(15,2),
    within_tolerance BOOLEAN DEFAULT TRUE,
    performance_rating epr_performance_rating_enum,
    strategy_effectiveness TEXT,
    controls_effectiveness TEXT,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_objectives_review_report_id ON end_project_report_objectives_review(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_objectives_review_area ON end_project_report_objectives_review(objective_area);

COMMENT ON TABLE end_project_report_objectives_review IS 'Objectives performance review for End Project Reports';

-- ================================================
-- TABLE 6: end_project_report_team_performance
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_team_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    team_member_id UUID REFERENCES users(id),
    team_name VARCHAR(200),
    role VARCHAR(200),
    performance_type epr_performance_type_enum NOT NULL,
    performance_description TEXT NOT NULL,
    achievements TEXT[],
    recognition_category epr_recognition_category_enum,
    is_highlighted BOOLEAN DEFAULT FALSE,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_team_perf_report_id ON end_project_report_team_performance(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_team_perf_member_id ON end_project_report_team_performance(team_member_id);
CREATE INDEX IF NOT EXISTS idx_epr_team_perf_type ON end_project_report_team_performance(performance_type);

COMMENT ON TABLE end_project_report_team_performance IS 'Team performance and recognition for End Project Reports';

-- ================================================
-- TABLE 7: end_project_report_quality_records
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_quality_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    activity_name VARCHAR(200) NOT NULL,
    activity_type epr_quality_activity_type_enum NOT NULL,
    product_id UUID,
    product_name VARCHAR(200),
    planned_date DATE,
    actual_date DATE,
    status epr_quality_activity_status_enum DEFAULT 'planned',
    result epr_quality_activity_result_enum,
    findings_summary TEXT,
    actions_taken TEXT,
    reviewer_id UUID REFERENCES users(id),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_quality_records_report_id ON end_project_report_quality_records(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_quality_records_product_id ON end_project_report_quality_records(product_id);
CREATE INDEX IF NOT EXISTS idx_epr_quality_records_status ON end_project_report_quality_records(status);

COMMENT ON TABLE end_project_report_quality_records IS 'Quality activity records for End Project Reports';

-- ================================================
-- TABLE 8: end_project_report_approval_records
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_approval_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    product_id UUID,
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT,
    approval_status epr_product_approval_status_enum NOT NULL,
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_name VARCHAR(200),
    approval_date DATE,
    conditions TEXT,
    rejection_reason TEXT,
    evidence_reference TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_approval_records_report_id ON end_project_report_approval_records(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_approval_records_product_id ON end_project_report_approval_records(product_id);
CREATE INDEX IF NOT EXISTS idx_epr_approval_records_status ON end_project_report_approval_records(approval_status);

COMMENT ON TABLE end_project_report_approval_records IS 'Product approval records for End Project Reports';

-- ================================================
-- TABLE 9: end_project_report_off_specifications
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_off_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    off_spec_type epr_off_spec_type_enum NOT NULL,
    product_id UUID,
    product_name VARCHAR(200),
    original_requirement TEXT NOT NULL,
    actual_delivery TEXT,
    deviation_description TEXT NOT NULL,
    impact_assessment TEXT,
    concession_granted BOOLEAN DEFAULT FALSE,
    concession_reference VARCHAR(200),
    concession_granted_by UUID REFERENCES users(id),
    concession_date DATE,
    concession_conditions TEXT,
    follow_on_action_required BOOLEAN DEFAULT FALSE,
    follow_on_action_id UUID REFERENCES follow_on_actions(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_off_specs_report_id ON end_project_report_off_specifications(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_off_specs_product_id ON end_project_report_off_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_epr_off_specs_type ON end_project_report_off_specifications(off_spec_type);

COMMENT ON TABLE end_project_report_off_specifications IS 'Off-specification products for End Project Reports';

-- ================================================
-- TABLE 10: end_project_report_lessons
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    lesson_type epr_lesson_type_enum NOT NULL,
    category epr_lesson_category_enum NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    impact epr_lesson_impact_enum,
    root_cause TEXT,
    recommendation TEXT,
    target_audience epr_lesson_target_audience_enum,
    applicability_scope TEXT,
    is_escalated_corporate BOOLEAN DEFAULT FALSE,
    corporate_lesson_id UUID REFERENCES lessons_learned(id) ON DELETE SET NULL,
    identified_by UUID REFERENCES users(id),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_lessons_report_id ON end_project_report_lessons(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_lessons_type ON end_project_report_lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_epr_lessons_corporate_id ON end_project_report_lessons(corporate_lesson_id);

COMMENT ON TABLE end_project_report_lessons IS 'Lessons learned for End Project Reports';

-- ================================================
-- TABLE 11: end_project_report_follow_on_actions
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_follow_on_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    follow_on_action_id UUID NOT NULL REFERENCES follow_on_actions(id) ON DELETE CASCADE,
    source_type epr_follow_on_source_type_enum,
    source_reference VARCHAR(200),
    documentation_attached BOOLEAN DEFAULT FALSE,
    documentation_urls TEXT[],
    project_board_advice_requested BOOLEAN DEFAULT FALSE,
    recommended_recipient TEXT,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_follow_on_report_id ON end_project_report_follow_on_actions(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_follow_on_action_id ON end_project_report_follow_on_actions(follow_on_action_id);
CREATE INDEX IF NOT EXISTS idx_epr_follow_on_source_type ON end_project_report_follow_on_actions(source_type);

COMMENT ON TABLE end_project_report_follow_on_actions IS 'Follow-on actions linked to End Project Reports';

-- ================================================
-- TABLE 12: end_project_report_quality_checks
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_report_quality_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_project_report_id UUID NOT NULL REFERENCES end_project_reports(id) ON DELETE CASCADE,
    criterion_number INTEGER NOT NULL CHECK (criterion_number >= 1 AND criterion_number <= 4),
    criterion_name VARCHAR(200) NOT NULL,
    criterion_description TEXT,
    is_automated BOOLEAN DEFAULT FALSE,
    validation_status epr_quality_check_status_enum DEFAULT 'not_checked',
    automated_check_result JSONB,
    manual_check_comment TEXT,
    override_reason TEXT,
    is_blocking BOOLEAN DEFAULT FALSE,
    checked_by UUID REFERENCES users(id),
    checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(end_project_report_id, criterion_number)
);

CREATE INDEX IF NOT EXISTS idx_epr_quality_checks_report_id ON end_project_report_quality_checks(end_project_report_id);
CREATE INDEX IF NOT EXISTS idx_epr_quality_checks_status ON end_project_report_quality_checks(validation_status);

COMMENT ON TABLE end_project_report_quality_checks IS 'Quality criteria validation for End Project Reports';

-- ================================================
-- AUDIT TRIGGERS
-- ================================================

-- Add audit triggers for all new tables
CREATE TRIGGER trg_epr_revision_history_created_at
    BEFORE INSERT ON end_project_report_revision_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_epr_approvals_created_at
    BEFORE INSERT ON end_project_report_approvals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_epr_distribution_created_at
    BEFORE INSERT ON end_project_report_distribution
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_epr_bc_review_audit
    BEFORE INSERT OR UPDATE ON end_project_report_business_case_review
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trg_epr_objectives_review_audit
    BEFORE INSERT OR UPDATE ON end_project_report_objectives_review
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trg_epr_team_perf_audit
    BEFORE INSERT OR UPDATE ON end_project_report_team_performance
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trg_epr_quality_records_audit
    BEFORE INSERT OR UPDATE ON end_project_report_quality_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trg_epr_approval_records_audit
    BEFORE INSERT OR UPDATE ON end_project_report_approval_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trg_epr_off_specs_audit
    BEFORE INSERT OR UPDATE ON end_project_report_off_specifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trg_epr_lessons_audit
    BEFORE INSERT OR UPDATE ON end_project_report_lessons
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trg_epr_quality_checks_audit
    BEFORE INSERT OR UPDATE ON end_project_report_quality_checks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- ================================================
-- DATABASE FUNCTIONS
-- ================================================

-- Function: Generate End Project Report Reference
CREATE OR REPLACE FUNCTION generate_end_project_report_ref(p_project_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_project_code VARCHAR;
    v_sequence INTEGER;
    v_reference VARCHAR;
BEGIN
    -- Get project code
    SELECT project_code INTO v_project_code
    FROM projects
    WHERE id = p_project_id AND is_deleted = FALSE;
    
    IF v_project_code IS NULL THEN
        v_project_code := 'PROJ' || SUBSTRING(p_project_id::TEXT, 1, 8);
    END IF;
    
    -- Get next sequence number for this project
    SELECT COALESCE(MAX(CAST(SUBSTRING(document_ref FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM end_project_reports
    WHERE project_id = p_project_id
      AND document_ref IS NOT NULL
      AND document_ref LIKE 'EPR-' || v_project_code || '-%';
    
    -- Generate reference: EPR-PROJ001-001
    v_reference := 'EPR-' || v_project_code || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$;

COMMENT ON FUNCTION generate_end_project_report_ref IS 'Generates unique document reference for End Project Reports';

-- Function: Get Business Case for Review
-- Uses business_cases (expected_benefits TEXT[]). When business_case_benefits exists, migrate this to use it.
CREATE OR REPLACE FUNCTION get_business_case_for_review(p_project_id UUID)
RETURNS TABLE (
    business_case_id UUID,
    benefits JSONB,
    total_expected_benefits DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bc.id AS business_case_id,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('description', b))
             FROM unnest(COALESCE(bc.expected_benefits, ARRAY[]::TEXT[])) AS b),
            '[]'::jsonb
        ) AS benefits,
        COALESCE(bc.return_on_investment, 0)::DECIMAL AS total_expected_benefits
    FROM business_cases bc
    WHERE bc.project_id = p_project_id
      AND bc.is_deleted = FALSE
      AND bc.is_approved = TRUE
    ORDER BY bc.created_at DESC
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_business_case_for_review IS 'Returns active business case data for benefits comparison';

-- Function: Calculate Benefits Variance
CREATE OR REPLACE FUNCTION calculate_benefits_variance(p_end_project_report_id UUID)
RETURNS TABLE (
    total_expected DECIMAL,
    total_achieved DECIMAL,
    total_residual DECIMAL,
    variance DECIMAL,
    variance_percentage DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_expected DECIMAL := 0;
    v_total_achieved DECIMAL := 0;
    v_total_residual DECIMAL := 0;
    v_variance DECIMAL;
    v_variance_percentage DECIMAL;
BEGIN
    -- Calculate totals from business case review
    SELECT
        COALESCE(SUM(CASE WHEN benefit_type IN ('achieved', 'expected_net') THEN original_target_value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN benefit_type = 'achieved' THEN actual_value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN benefit_type = 'residual' THEN actual_value ELSE 0 END), 0)
    INTO v_total_expected, v_total_achieved, v_total_residual
    FROM end_project_report_business_case_review
    WHERE end_project_report_id = p_end_project_report_id;
    
    -- Calculate variance
    v_variance := v_total_achieved - v_total_expected;
    v_variance_percentage := CASE 
        WHEN v_total_expected > 0 THEN (v_variance / v_total_expected) * 100
        ELSE 0
    END;
    
    RETURN QUERY
    SELECT v_total_expected, v_total_achieved, v_total_residual, v_variance, v_variance_percentage;
END;
$$;

COMMENT ON FUNCTION calculate_benefits_variance IS 'Calculates variance between expected and realized benefits';

-- Function: Get Open Issues for Follow-On
CREATE OR REPLACE FUNCTION get_open_issues_for_follow_on(p_project_id UUID)
RETURNS TABLE (
    issue_id UUID,
    issue_title VARCHAR,
    issue_status VARCHAR,
    needs_follow_on BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id AS issue_id,
        i.issue_title,
        i.issue_status,
        CASE WHEN i.issue_status NOT IN ('closed', 'resolved') THEN TRUE ELSE FALSE END AS needs_follow_on
    FROM issues i
    WHERE i.project_id = p_project_id
      AND i.is_deleted = FALSE
      AND i.issue_status NOT IN ('closed', 'resolved');
END;
$$;

COMMENT ON FUNCTION get_open_issues_for_follow_on IS 'Returns all open issues that need follow-on actions';

-- Function: Get Open Risks for Follow-On
CREATE OR REPLACE FUNCTION get_open_risks_for_follow_on(p_project_id UUID)
RETURNS TABLE (
    risk_id UUID,
    risk_title VARCHAR,
    risk_status VARCHAR,
    needs_follow_on BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id AS risk_id,
        r.risk_title,
        r.risk_status,
        CASE WHEN r.risk_status NOT IN ('closed', 'mitigated') THEN TRUE ELSE FALSE END AS needs_follow_on
    FROM risks r
    WHERE r.project_id = p_project_id
      AND r.is_deleted = FALSE
      AND r.risk_status NOT IN ('closed', 'mitigated');
END;
$$;

COMMENT ON FUNCTION get_open_risks_for_follow_on IS 'Returns all open risks that need follow-on actions';

-- Function: Initialize EPR Quality Checks
CREATE OR REPLACE FUNCTION initialize_epr_quality_checks(p_end_project_report_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert 4 quality criteria
    INSERT INTO end_project_report_quality_checks (
        end_project_report_id,
        criterion_number,
        criterion_name,
        criterion_description,
        is_automated,
        is_blocking
    ) VALUES
    (
        p_end_project_report_id,
        1,
        'Abnormal situations described with impact',
        'Any abnormal situations are described with their impact',
        TRUE,
        TRUE
    ),
    (
        p_end_project_report_id,
        2,
        'All Issues closed or have follow-on action',
        'All Issues are closed or have follow-on action recommendation',
        TRUE,
        TRUE
    ),
    (
        p_end_project_report_id,
        3,
        'Documentation accompanies follow-on actions',
        'Documentation accompanies follow-on action recommendations',
        TRUE,
        FALSE
    ),
    (
        p_end_project_report_id,
        4,
        'Project Assurance roles agree',
        'Project Assurance roles agree with the report',
        FALSE,
        TRUE
    )
    ON CONFLICT (end_project_report_id, criterion_number) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION initialize_epr_quality_checks IS 'Creates 4 quality check records for a new end project report';

-- Function: Run EPR Quality Checks
CREATE OR REPLACE FUNCTION run_epr_quality_checks(p_end_project_report_id UUID)
RETURNS TABLE (
    criterion_number INTEGER,
    criterion_name VARCHAR,
    validation_status VARCHAR,
    check_details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_report RECORD;
    v_open_issues_count INTEGER;
    v_follow_on_count INTEGER;
    v_documented_count INTEGER;
    v_total_follow_on INTEGER;
    v_documentation_percentage DECIMAL;
BEGIN
    -- Get report data
    SELECT * INTO v_report
    FROM end_project_reports
    WHERE id = p_end_project_report_id;
    
    -- Criterion 1: Abnormal situations described with impact
    IF v_report.closure_type != 'normal' THEN
        IF v_report.abnormal_situations IS NULL OR LENGTH(TRIM(v_report.abnormal_situations)) < 50 THEN
            UPDATE end_project_report_quality_checks
            SET validation_status = 'failed',
                automated_check_result = jsonb_build_object(
                    'message', 'Abnormal situations must be described (minimum 50 characters)',
                    'closure_type', v_report.closure_type
                ),
                updated_at = NOW()
            WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 1;
        ELSIF v_report.abnormal_situations_impact IS NULL OR LENGTH(TRIM(v_report.abnormal_situations_impact)) < 50 THEN
            UPDATE end_project_report_quality_checks
            SET validation_status = 'failed',
                automated_check_result = jsonb_build_object(
                    'message', 'Impact of abnormal situations must be described (minimum 50 characters)'
                ),
                updated_at = NOW()
            WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 1;
        ELSE
            UPDATE end_project_report_quality_checks
            SET validation_status = 'passed',
                automated_check_result = jsonb_build_object('message', 'Abnormal situations and impact described'),
                updated_at = NOW()
            WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 1;
        END IF;
    ELSE
        UPDATE end_project_report_quality_checks
        SET validation_status = 'passed',
            automated_check_result = jsonb_build_object('message', 'Normal closure - no abnormal situations'),
            updated_at = NOW()
        WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 1;
    END IF;
    
    -- Criterion 2: All Issues closed or have follow-on action
    SELECT COUNT(*) INTO v_open_issues_count
    FROM issues i
    WHERE i.project_id = v_report.project_id
      AND i.is_deleted = FALSE
      AND i.issue_status NOT IN ('closed', 'resolved');
    
    SELECT COUNT(*) INTO v_follow_on_count
    FROM end_project_report_follow_on_actions epr_foa
    JOIN follow_on_actions fo ON fo.id = epr_foa.follow_on_action_id
    WHERE epr_foa.end_project_report_id = p_end_project_report_id
      AND fo.source_type = 'open_issue';
    
    IF v_open_issues_count = 0 OR v_open_issues_count <= v_follow_on_count THEN
        UPDATE end_project_report_quality_checks
        SET validation_status = 'passed',
            automated_check_result = jsonb_build_object(
                'message', 'All issues closed or have follow-on actions',
                'open_issues', v_open_issues_count,
                'follow_on_actions', v_follow_on_count
            ),
            updated_at = NOW()
        WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 2;
    ELSE
        UPDATE end_project_report_quality_checks
        SET validation_status = 'failed',
            automated_check_result = jsonb_build_object(
                'message', format('%s open issues without follow-on actions', v_open_issues_count - v_follow_on_count),
                'open_issues', v_open_issues_count,
                'follow_on_actions', v_follow_on_count
            ),
            updated_at = NOW()
        WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 2;
    END IF;
    
    -- Criterion 3: Documentation accompanies follow-on actions
    SELECT 
        COUNT(*) FILTER (WHERE documentation_attached = TRUE OR array_length(documentation_urls, 1) > 0),
        COUNT(*)
    INTO v_documented_count, v_total_follow_on
    FROM end_project_report_follow_on_actions
    WHERE end_project_report_id = p_end_project_report_id;
    
    IF v_total_follow_on = 0 THEN
        v_documentation_percentage := 100;
    ELSE
        v_documentation_percentage := (v_documented_count::DECIMAL / v_total_follow_on::DECIMAL) * 100;
    END IF;
    
    IF v_documentation_percentage >= 80 THEN
        UPDATE end_project_report_quality_checks
        SET validation_status = 'passed',
            automated_check_result = jsonb_build_object(
                'message', format('%.0f%% of follow-on actions have documentation', v_documentation_percentage),
                'documented', v_documented_count,
                'total', v_total_follow_on
            ),
            updated_at = NOW()
        WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 3;
    ELSE
        UPDATE end_project_report_quality_checks
        SET validation_status = 'needs_review',
            automated_check_result = jsonb_build_object(
                'message', format('Only %.0f%% of follow-on actions have documentation (recommended: 80%%)', v_documentation_percentage),
                'documented', v_documented_count,
                'total', v_total_follow_on
            ),
            updated_at = NOW()
        WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 3;
    END IF;
    
    -- Criterion 4: Project Assurance roles agree (manual check)
    IF v_report.project_assurance_agreement = TRUE THEN
        UPDATE end_project_report_quality_checks
        SET validation_status = 'passed',
            automated_check_result = jsonb_build_object('message', 'Project Assurance roles agree'),
            updated_at = NOW()
        WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 4;
    ELSE
        UPDATE end_project_report_quality_checks
        SET validation_status = 'needs_review',
            automated_check_result = jsonb_build_object('message', 'Project Assurance agreement pending'),
            updated_at = NOW()
        WHERE end_project_report_id = p_end_project_report_id AND criterion_number = 4;
    END IF;
    
    -- Return results
    RETURN QUERY
    SELECT
        qc.criterion_number,
        qc.criterion_name,
        qc.validation_status::VARCHAR,
        qc.automated_check_result
    FROM end_project_report_quality_checks qc
    WHERE qc.end_project_report_id = p_end_project_report_id
    ORDER BY qc.criterion_number;
END;
$$;

COMMENT ON FUNCTION run_epr_quality_checks IS 'Executes all automated quality validations for End Project Reports';

-- Function: Get EPR Quality Summary
CREATE OR REPLACE FUNCTION get_epr_quality_summary(p_end_project_report_id UUID)
RETURNS TABLE (
    total_criteria INTEGER,
    passed INTEGER,
    failed INTEGER,
    needs_review INTEGER,
    not_checked INTEGER,
    can_close_project BOOLEAN,
    blocking_issues TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_passed INTEGER;
    v_failed INTEGER;
    v_needs_review INTEGER;
    v_not_checked INTEGER;
    v_total INTEGER;
    v_blocking_issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Count criteria by status
    SELECT
        COUNT(*) FILTER (WHERE validation_status = 'passed'),
        COUNT(*) FILTER (WHERE validation_status = 'failed'),
        COUNT(*) FILTER (WHERE validation_status = 'needs_review'),
        COUNT(*) FILTER (WHERE validation_status = 'not_checked'),
        COUNT(*)
    INTO v_passed, v_failed, v_needs_review, v_not_checked, v_total
    FROM end_project_report_quality_checks
    WHERE end_project_report_id = p_end_project_report_id;
    
    -- Collect blocking issues
    SELECT ARRAY_AGG(criterion_name)
    INTO v_blocking_issues
    FROM end_project_report_quality_checks
    WHERE end_project_report_id = p_end_project_report_id
      AND is_blocking = TRUE
      AND validation_status IN ('failed', 'needs_review');
    
    -- Can close if no blocking failures
    RETURN QUERY
    SELECT
        v_total,
        v_passed,
        v_failed,
        v_needs_review,
        v_not_checked,
        (v_failed = 0 AND v_needs_review = 0) AS can_close_project,
        COALESCE(v_blocking_issues, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION get_epr_quality_summary IS 'Returns quality check summary and completion status';

-- Function: Escalate Lesson to Corporate
CREATE OR REPLACE FUNCTION escalate_lesson_to_corporate(p_lesson_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_lesson RECORD;
    v_corporate_lesson_id UUID;
BEGIN
    -- Get lesson data
    SELECT * INTO v_lesson
    FROM end_project_report_lessons
    WHERE id = p_lesson_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lesson not found';
    END IF;
    
    -- Create corporate lesson
    INSERT INTO lessons_learned (
        project_id,
        lesson_title,
        lesson_description,
        lesson_type,
        category_id,
        impact_level,
        recommendation,
        identified_by,
        created_by
    )
    SELECT
        (SELECT project_id FROM end_project_reports WHERE id = v_lesson.end_project_report_id),
        v_lesson.title,
        v_lesson.description,
        CASE 
            WHEN v_lesson.lesson_type = 'what_went_well' THEN 'positive'
            WHEN v_lesson.lesson_type = 'what_went_badly' THEN 'negative'
            ELSE 'suggestion'
        END,
        NULL, -- category_id would need lookup
        CASE 
            WHEN v_lesson.impact = 'low' THEN 'low'
            WHEN v_lesson.impact = 'medium' THEN 'medium'
            WHEN v_lesson.impact = 'high' THEN 'high'
            WHEN v_lesson.impact = 'critical' THEN 'critical'
            ELSE 'medium'
        END,
        v_lesson.recommendation,
        v_lesson.identified_by,
        p_user_id
    RETURNING id INTO v_corporate_lesson_id;
    
    -- Update EPR lesson with corporate link
    UPDATE end_project_report_lessons
    SET is_escalated_corporate = TRUE,
        corporate_lesson_id = v_corporate_lesson_id,
        updated_at = NOW()
    WHERE id = p_lesson_id;
    
    RETURN v_corporate_lesson_id;
END;
$$;

COMMENT ON FUNCTION escalate_lesson_to_corporate IS 'Escalates a lesson from EPR to the corporate lessons_learned table';

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger: Auto-generate document reference
CREATE OR REPLACE FUNCTION trigger_generate_end_project_report_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.document_ref IS NULL THEN
        NEW.document_ref := generate_end_project_report_ref(NEW.project_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_end_project_reports_generate_ref
    BEFORE INSERT ON end_project_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_end_project_report_ref();

-- Trigger: Auto-initialize quality checks
CREATE OR REPLACE FUNCTION trigger_initialize_epr_quality_checks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM initialize_epr_quality_checks(NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_end_project_reports_initialize_quality_checks
    AFTER INSERT ON end_project_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_epr_quality_checks();

-- ================================================
-- REGISTER TABLES
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('end_project_report_revision_history', 'Revision history for End Project Reports', false, true, 'structured'),
    ('end_project_report_approvals', 'Approval workflow for End Project Reports', false, true, 'structured'),
    ('end_project_report_distribution', 'Distribution list for End Project Reports', false, true, 'structured'),
    ('end_project_report_business_case_review', 'Business Case benefits review for End Project Reports', false, true, 'structured'),
    ('end_project_report_objectives_review', 'Objectives performance review for End Project Reports', false, true, 'structured'),
    ('end_project_report_team_performance', 'Team performance and recognition for End Project Reports', false, true, 'structured'),
    ('end_project_report_quality_records', 'Quality activity records for End Project Reports', false, true, 'structured'),
    ('end_project_report_approval_records', 'Product approval records for End Project Reports', false, true, 'structured'),
    ('end_project_report_off_specifications', 'Off-specification products for End Project Reports', false, true, 'structured'),
    ('end_project_report_lessons', 'Lessons learned for End Project Reports', false, true, 'structured'),
    ('end_project_report_follow_on_actions', 'Follow-on actions linked to End Project Reports', false, true, 'structured'),
    ('end_project_report_quality_checks', 'Quality criteria validation for End Project Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
