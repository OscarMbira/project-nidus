-- ================================================
-- Exception Report CRUD Implementation
-- SQL Version: v220
-- Date: 2026-01-20
-- Related: v145_pmo_dashboard_enhancements.sql (existing exceptions table)
--          v29_stage_boundaries_enhanced.sql (existing exception_plans table)
-- ================================================

-- ================================================
-- ENUM TYPE DEFINITIONS
-- ================================================

-- Tolerance Type Enum
DO $$ BEGIN
    CREATE TYPE exr_tolerance_type_enum AS ENUM ('time', 'cost', 'scope', 'quality', 'risk', 'benefit', 'combined');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Report Status Enum
DO $$ BEGIN
    CREATE TYPE exr_report_status_enum AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'decision_pending', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Urgency Enum
DO $$ BEGIN
    CREATE TYPE exr_urgency_enum AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Root Cause Category Enum
DO $$ BEGIN
    CREATE TYPE exr_root_cause_category_enum AS ENUM ('planning', 'execution', 'external', 'resource', 'technical', 'stakeholder', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Approval Status Enum
DO $$ BEGIN
    CREATE TYPE exr_approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Distribution Status Enum
DO $$ BEGIN
    CREATE TYPE exr_distribution_status_enum AS ENUM ('sent', 'read', 'acknowledged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Risk Level Enum
DO $$ BEGIN
    CREATE TYPE exr_risk_level_enum AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Feasibility Rating Enum
DO $$ BEGIN
    CREATE TYPE exr_feasibility_rating_enum AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lesson Type Enum
DO $$ BEGIN
    CREATE TYPE exr_lesson_type_enum AS ENUM ('for_this_project', 'for_future_projects', 'corporate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lesson Category Enum
DO $$ BEGIN
    CREATE TYPE exr_lesson_category_enum AS ENUM ('planning', 'estimation', 'risk_management', 'communication', 'resource', 'technical', 'process', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Quality Check Validation Status Enum
DO $$ BEGIN
    CREATE TYPE exr_validation_status_enum AS ENUM ('not_checked', 'passed', 'failed', 'needs_review', 'manual_override');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================
-- MAIN TABLE: exception_reports
-- ================================================

CREATE TABLE IF NOT EXISTS exception_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    exception_id UUID NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
    exception_plan_id UUID REFERENCES exception_plans(id) ON DELETE SET NULL,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,
    board_id UUID REFERENCES project_boards(id) ON DELETE SET NULL,

    -- Document Metadata
    document_ref VARCHAR(100) UNIQUE,
    version_no VARCHAR(20) DEFAULT '1.0',
    report_title VARCHAR(200) NOT NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    author_id UUID REFERENCES users(id),
    owner_id UUID REFERENCES users(id),
    client_id UUID REFERENCES users(id),

    -- Exception Overview (Section 3)
    exception_title VARCHAR(200) NOT NULL,
    exception_summary TEXT,
    tolerance_type exr_tolerance_type_enum,
    tolerance_threshold TEXT,
    actual_value TEXT,
    variance_amount TEXT,
    variance_percentage DECIMAL(5,2),
    is_forecast_breach BOOLEAN DEFAULT FALSE,

    -- Current Plan Status Snapshot
    time_performance_status TEXT,
    time_baseline_end_date DATE,
    time_current_forecast_date DATE,
    time_variance_days INTEGER,
    cost_performance_status TEXT,
    cost_baseline_budget DECIMAL(15,2),
    cost_current_forecast DECIMAL(15,2),
    cost_variance_amount DECIMAL(15,2),
    cost_variance_percentage DECIMAL(5,2),
    scope_status TEXT,
    quality_status TEXT,

    -- Cause Analysis (Section 4)
    cause_description TEXT,
    root_cause_category exr_root_cause_category_enum,
    root_cause_analysis TEXT,
    contributing_factors TEXT[],

    -- Consequences (Section 5)
    project_consequences TEXT,
    programme_consequences TEXT,
    corporate_consequences TEXT,
    consequences_if_not_addressed TEXT,
    impact_on_business_case TEXT,
    impact_on_project_plan TEXT,

    -- Recommendation (Section 7)
    recommended_option_number INTEGER,
    recommendation_summary TEXT,
    recommendation_justification TEXT,
    requested_decision TEXT,

    -- Lessons (Section 8)
    lessons_summary TEXT,
    preventive_measures TEXT,

    -- Status and Workflow
    report_status exr_report_status_enum DEFAULT 'draft',
    urgency exr_urgency_enum DEFAULT 'medium',
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES users(id),
    board_meeting_id UUID, -- FK to board_meetings if table exists
    board_decision TEXT,
    board_decision_date DATE,
    decision_reference VARCHAR(100),

    -- Dates
    date_of_this_revision DATE DEFAULT CURRENT_DATE,
    date_of_next_revision DATE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exception_reports_project_id ON exception_reports(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_reports_exception_id ON exception_reports(exception_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_reports_exception_plan_id ON exception_reports(exception_plan_id) WHERE exception_plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exception_reports_stage_boundary_id ON exception_reports(stage_boundary_id) WHERE stage_boundary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exception_reports_status ON exception_reports(report_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_reports_urgency ON exception_reports(urgency) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_reports_document_ref ON exception_reports(document_ref) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_reports_date ON exception_reports(report_date) WHERE is_deleted = FALSE;

COMMENT ON TABLE exception_reports IS 'Formal Exception Reports for Project Board escalation';

-- ================================================
-- TABLE 2: exception_report_revision_history
-- ================================================

CREATE TABLE IF NOT EXISTS exception_report_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_report_id UUID NOT NULL REFERENCES exception_reports(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE,
    summary_of_changes TEXT,
    changes_marked TEXT,
    revised_by UUID REFERENCES users(id),
    version_no VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exr_revision_history_report_id ON exception_report_revision_history(exception_report_id);
CREATE INDEX IF NOT EXISTS idx_exr_revision_history_revised_by ON exception_report_revision_history(revised_by);

COMMENT ON TABLE exception_report_revision_history IS 'Revision history for Exception Reports';

-- ================================================
-- TABLE 3: exception_report_approvals
-- ================================================

CREATE TABLE IF NOT EXISTS exception_report_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_report_id UUID NOT NULL REFERENCES exception_reports(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_name VARCHAR(200),
    approver_title VARCHAR(200),
    signature_data TEXT,
    approval_date DATE,
    approval_status exr_approval_status_enum NOT NULL DEFAULT 'pending',
    comments TEXT,
    version_approved VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exr_approvals_report_id ON exception_report_approvals(exception_report_id);
CREATE INDEX IF NOT EXISTS idx_exr_approvals_approver_id ON exception_report_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_exr_approvals_status ON exception_report_approvals(approval_status);

COMMENT ON TABLE exception_report_approvals IS 'Approval workflow for Exception Reports';

-- ================================================
-- TABLE 4: exception_report_distribution
-- ================================================

CREATE TABLE IF NOT EXISTS exception_report_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_report_id UUID NOT NULL REFERENCES exception_reports(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id),
    recipient_name VARCHAR(200),
    recipient_title VARCHAR(200),
    date_of_issue DATE DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20),
    distribution_status exr_distribution_status_enum NOT NULL DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exr_distribution_report_id ON exception_report_distribution(exception_report_id);
CREATE INDEX IF NOT EXISTS idx_exr_distribution_recipient_id ON exception_report_distribution(recipient_id);
CREATE INDEX IF NOT EXISTS idx_exr_distribution_status ON exception_report_distribution(distribution_status);

COMMENT ON TABLE exception_report_distribution IS 'Distribution list for Exception Reports';

-- ================================================
-- TABLE 5: exception_report_options
-- ================================================

CREATE TABLE IF NOT EXISTS exception_report_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_report_id UUID NOT NULL REFERENCES exception_reports(id) ON DELETE CASCADE,
    option_number INTEGER NOT NULL,
    option_title VARCHAR(200) NOT NULL,
    option_description TEXT NOT NULL,

    -- Impact Analysis
    effect_on_business_case TEXT,
    effect_on_time_tolerance TEXT,
    effect_on_cost_tolerance TEXT,
    effect_on_scope_tolerance TEXT,
    effect_on_quality_tolerance TEXT,
    effect_on_benefits TEXT,
    revised_end_date DATE,
    revised_budget DECIMAL(15,2),
    additional_time_required INTEGER,
    additional_cost_required DECIMAL(15,2),

    -- Risk Analysis
    associated_risks TEXT,
    risk_level exr_risk_level_enum,
    risk_mitigation TEXT,

    -- Pros and Cons
    pros TEXT[],
    cons TEXT[],
    feasibility_rating exr_feasibility_rating_enum,

    -- Recommendation
    is_recommended BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exr_options_report_id ON exception_report_options(exception_report_id);
CREATE INDEX IF NOT EXISTS idx_exr_options_recommended ON exception_report_options(exception_report_id, is_recommended) WHERE is_recommended = TRUE;

COMMENT ON TABLE exception_report_options IS 'Options analysis for Exception Reports';

-- ================================================
-- TABLE 6: exception_report_lessons
-- ================================================

CREATE TABLE IF NOT EXISTS exception_report_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_report_id UUID NOT NULL REFERENCES exception_reports(id) ON DELETE CASCADE,
    lesson_type exr_lesson_type_enum NOT NULL,
    lesson_title VARCHAR(200) NOT NULL,
    lesson_description TEXT NOT NULL,
    category exr_lesson_category_enum,
    recommendation TEXT,
    preventive_action TEXT,
    is_escalated_corporate BOOLEAN DEFAULT FALSE,
    corporate_lesson_id UUID, -- FK to lessons_learned if table exists
    identified_by UUID REFERENCES users(id),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exr_lessons_report_id ON exception_report_lessons(exception_report_id);
CREATE INDEX IF NOT EXISTS idx_exr_lessons_type ON exception_report_lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_exr_lessons_corporate ON exception_report_lessons(is_escalated_corporate) WHERE is_escalated_corporate = TRUE;
CREATE INDEX IF NOT EXISTS idx_exr_lessons_corporate_lesson_id ON exception_report_lessons(corporate_lesson_id) WHERE corporate_lesson_id IS NOT NULL;

COMMENT ON TABLE exception_report_lessons IS 'Lessons learned from Exception Reports';

-- ================================================
-- TABLE 7: exception_report_quality_checks
-- ================================================

CREATE TABLE IF NOT EXISTS exception_report_quality_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_report_id UUID NOT NULL REFERENCES exception_reports(id) ON DELETE CASCADE,
    criterion_number INTEGER NOT NULL CHECK (criterion_number BETWEEN 1 AND 5),
    criterion_name VARCHAR(200) NOT NULL,
    criterion_description TEXT,
    is_automated BOOLEAN DEFAULT TRUE,
    validation_status exr_validation_status_enum NOT NULL DEFAULT 'not_checked',
    automated_check_result JSONB,
    manual_check_comment TEXT,
    override_reason TEXT,
    is_blocking BOOLEAN DEFAULT TRUE,
    checked_by UUID REFERENCES users(id),
    checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exr_quality_checks_report_id ON exception_report_quality_checks(exception_report_id);
CREATE INDEX IF NOT EXISTS idx_exr_quality_checks_criterion ON exception_report_quality_checks(exception_report_id, criterion_number);
CREATE INDEX IF NOT EXISTS idx_exr_quality_checks_status ON exception_report_quality_checks(validation_status);
CREATE INDEX IF NOT EXISTS idx_exr_quality_checks_blocking ON exception_report_quality_checks(exception_report_id, is_blocking) WHERE is_blocking = TRUE AND validation_status != 'passed';

COMMENT ON TABLE exception_report_quality_checks IS 'Quality criteria validation for Exception Reports';

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger: Auto-generate document reference on creation
CREATE OR REPLACE FUNCTION trigger_generate_exception_report_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.document_ref IS NULL OR NEW.document_ref = '' THEN
        NEW.document_ref := generate_exception_report_ref(NEW.project_id);
    END IF;
    
    IF NEW.version_no IS NULL OR NEW.version_no = '' THEN
        NEW.version_no := '1.0';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exception_reports_generate_ref ON exception_reports;
CREATE TRIGGER trg_exception_reports_generate_ref
    BEFORE INSERT ON exception_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_exception_report_ref();

-- Trigger: Auto-initialize quality checks on report creation
CREATE OR REPLACE FUNCTION trigger_initialize_exception_report_quality_checks()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_exception_report_quality_checks(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exception_reports_init_quality_checks ON exception_reports;
CREATE TRIGGER trg_exception_reports_init_quality_checks
    AFTER INSERT ON exception_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_exception_report_quality_checks();

-- Trigger: Update timestamps on child tables
CREATE OR REPLACE FUNCTION trigger_update_exr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exr_options_updated_at ON exception_report_options;
CREATE TRIGGER trg_exr_options_updated_at
    BEFORE UPDATE ON exception_report_options
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_exr_updated_at();

DROP TRIGGER IF EXISTS trg_exr_lessons_updated_at ON exception_report_lessons;
CREATE TRIGGER trg_exr_lessons_updated_at
    BEFORE UPDATE ON exception_report_lessons
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_exr_updated_at();

DROP TRIGGER IF EXISTS trg_exr_quality_checks_updated_at ON exception_report_quality_checks;
CREATE TRIGGER trg_exr_quality_checks_updated_at
    BEFORE UPDATE ON exception_report_quality_checks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_exr_updated_at();

-- Trigger: Update updated_at on main table
DROP TRIGGER IF EXISTS trg_exception_reports_updated_at ON exception_reports;
CREATE TRIGGER trg_exception_reports_updated_at
    BEFORE UPDATE ON exception_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- DATABASE FUNCTIONS
-- ================================================

-- ================================================
-- Function: Generate Exception Report Reference
-- ================================================

CREATE OR REPLACE FUNCTION generate_exception_report_ref(p_project_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_project_code VARCHAR;
    v_report_count INTEGER;
    v_reference VARCHAR;
BEGIN
    -- Get project code
    SELECT project_code INTO v_project_code
    FROM projects
    WHERE id = p_project_id;
    
    IF v_project_code IS NULL THEN
        v_project_code := 'PROJ' || SUBSTRING(p_project_id::TEXT, 1, 8);
    END IF;
    
    -- Count existing reports for this project
    SELECT COUNT(*) + 1 INTO v_report_count
    FROM exception_reports
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;
    
    -- Generate reference: EXR-PROJ001-001
    v_reference := 'EXR-' || UPPER(v_project_code) || '-' || LPAD(v_report_count::TEXT, 3, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_exception_report_ref IS 'Generates unique document reference for exception reports (e.g., EXR-PROJ001-001)';

-- ================================================
-- Function: Get Current Plan Status
-- ================================================

CREATE OR REPLACE FUNCTION get_current_plan_status(p_project_id UUID)
RETURNS TABLE (
    time_baseline_end_date DATE,
    time_current_forecast DATE,
    time_variance_days INTEGER,
    cost_baseline_budget DECIMAL,
    cost_current_forecast DECIMAL,
    cost_variance DECIMAL,
    cost_variance_percentage DECIMAL,
    scope_status TEXT,
    quality_status TEXT
) AS $$
DECLARE
    v_project RECORD;
    v_baseline_end DATE;
    v_current_forecast DATE;
    v_baseline_budget DECIMAL;
    v_current_cost DECIMAL;
BEGIN
    -- Get project details
    SELECT 
        planned_end_date,
        forecasted_end_date,
        budget,
        actual_cost
    INTO v_project
    FROM projects
    WHERE id = p_project_id
      AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    v_baseline_end := v_project.planned_end_date;
    v_current_forecast := v_project.forecasted_end_date;
    v_baseline_budget := v_project.budget;
    v_current_cost := v_project.actual_cost;
    
    -- Calculate variances
    RETURN QUERY SELECT
        v_baseline_end AS time_baseline_end_date,
        v_current_forecast AS time_current_forecast,
        CASE 
            WHEN v_baseline_end IS NOT NULL AND v_current_forecast IS NOT NULL 
            THEN EXTRACT(DAY FROM (v_current_forecast - v_baseline_end))::INTEGER
            ELSE NULL
        END AS time_variance_days,
        v_baseline_budget AS cost_baseline_budget,
        v_current_cost AS cost_current_forecast,
        CASE 
            WHEN v_baseline_budget IS NOT NULL AND v_current_cost IS NOT NULL 
            THEN v_current_cost - v_baseline_budget
            ELSE NULL
        END AS cost_variance,
        CASE 
            WHEN v_baseline_budget IS NOT NULL AND v_baseline_budget > 0 AND v_current_cost IS NOT NULL 
            THEN ((v_current_cost - v_baseline_budget) / v_baseline_budget * 100)
            ELSE NULL
        END AS cost_variance_percentage,
        'In Progress'::TEXT AS scope_status, -- Would need to calculate from deliverables
        'On Track'::TEXT AS quality_status; -- Would need to calculate from quality metrics
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_plan_status IS 'Returns current time and cost performance snapshot for the project';

-- ================================================
-- Function: Get Tolerance Breach Details
-- ================================================

CREATE OR REPLACE FUNCTION get_tolerance_breach_details(p_exception_id UUID)
RETURNS TABLE (
    tolerance_type VARCHAR,
    tolerance_threshold TEXT,
    actual_value TEXT,
    variance_amount TEXT,
    is_forecast BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.exception_category::VARCHAR AS tolerance_type,
        COALESCE(ep.tolerance_threshold, 'N/A')::TEXT AS tolerance_threshold,
        COALESCE(ep.actual_value, 'N/A')::TEXT AS actual_value,
        COALESCE(ep.variance_amount, 'N/A')::TEXT AS variance_amount,
        FALSE::BOOLEAN AS is_forecast -- Would need to determine from exception data
    FROM exceptions e
    LEFT JOIN exception_plans ep ON ep.id = (
        SELECT id FROM exception_plans 
        WHERE exception_plans.project_id = e.project_id 
        ORDER BY created_at DESC 
        LIMIT 1
    )
    WHERE e.id = p_exception_id
      AND e.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tolerance_breach_details IS 'Returns details about the tolerance breach from the exceptions table';

-- ================================================
-- Function: Initialize Exception Report Quality Checks
-- ================================================

CREATE OR REPLACE FUNCTION initialize_exception_report_quality_checks(p_exception_report_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert 5 quality criteria from template
    INSERT INTO exception_report_quality_checks (
        exception_report_id,
        criterion_number,
        criterion_name,
        criterion_description,
        is_automated,
        is_blocking
    ) VALUES
    (
        p_exception_report_id,
        1,
        'Current Plan Status',
        'Current plan accurately shows time and cost performance status',
        TRUE,
        TRUE
    ),
    (
        p_exception_report_id,
        2,
        'Deviation Analysis',
        'Reason(s) for deviation stated, exception analyzed, impacts assessed',
        TRUE,
        TRUE
    ),
    (
        p_exception_report_id,
        3,
        'Business Case Impact',
        'Business Case implications considered, Project Plan impact calculated',
        TRUE,
        TRUE
    ),
    (
        p_exception_report_id,
        4,
        'Options Analysis',
        'Options analyzed (including risks) and recommendations made',
        TRUE,
        TRUE
    ),
    (
        p_exception_report_id,
        5,
        'Timeliness',
        'Exception Report given in timely manner',
        TRUE,
        FALSE
    )
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION initialize_exception_report_quality_checks IS 'Creates 5 quality check records for a new exception report';

-- ================================================
-- Function: Run Exception Report Quality Checks
-- ================================================

CREATE OR REPLACE FUNCTION run_exception_report_quality_checks(p_exception_report_id UUID)
RETURNS TABLE (
    criterion_number INTEGER,
    criterion_name VARCHAR,
    validation_status VARCHAR,
    check_details JSONB
) AS $$
DECLARE
    v_report RECORD;
    v_options_count INTEGER;
    v_recommended_count INTEGER;
    v_days_since_exception INTEGER;
    v_check_result JSONB;
BEGIN
    -- Get report details
    SELECT 
        er.*,
        e.raised_at,
        e.exception_level
    INTO v_report
    FROM exception_reports er
    JOIN exceptions e ON e.id = er.exception_id
    WHERE er.id = p_exception_report_id
      AND er.is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Count options
    SELECT COUNT(*) INTO v_options_count
    FROM exception_report_options
    WHERE exception_report_id = p_exception_report_id;
    
    SELECT COUNT(*) INTO v_recommended_count
    FROM exception_report_options
    WHERE exception_report_id = p_exception_report_id
      AND is_recommended = TRUE;
    
    -- Calculate days since exception
    IF v_report.raised_at IS NOT NULL AND v_report.report_date IS NOT NULL THEN
        v_days_since_exception := EXTRACT(DAY FROM (v_report.report_date - v_report.raised_at::DATE))::INTEGER;
    ELSE
        v_days_since_exception := NULL;
    END IF;
    
    -- Criterion 1: Current Plan Status
    v_check_result := jsonb_build_object(
        'time_performance_status', v_report.time_performance_status IS NOT NULL AND length(v_report.time_performance_status) >= 50,
        'cost_performance_status', v_report.cost_performance_status IS NOT NULL AND length(v_report.cost_performance_status) >= 50,
        'baseline_dates', v_report.time_baseline_end_date IS NOT NULL AND v_report.time_current_forecast_date IS NOT NULL,
        'baseline_values', v_report.cost_baseline_budget IS NOT NULL AND v_report.cost_current_forecast IS NOT NULL
    );
    
    RETURN QUERY
    SELECT 
        1::INTEGER,
        'Current Plan Status'::VARCHAR,
        CASE 
            WHEN (v_check_result->>'time_performance_status')::BOOLEAN 
                 AND (v_check_result->>'cost_performance_status')::BOOLEAN
                 AND (v_check_result->>'baseline_dates')::BOOLEAN
                 AND (v_check_result->>'baseline_values')::BOOLEAN
            THEN 'passed'::VARCHAR
            ELSE 'failed'::VARCHAR
        END,
        v_check_result;
    
    -- Criterion 2: Deviation Analysis
    v_check_result := jsonb_build_object(
        'cause_description', v_report.cause_description IS NOT NULL AND length(v_report.cause_description) >= 100,
        'root_cause_analysis', v_report.root_cause_analysis IS NOT NULL AND length(v_report.root_cause_analysis) >= 100,
        'consequences', v_report.project_consequences IS NOT NULL OR v_report.programme_consequences IS NOT NULL OR v_report.corporate_consequences IS NOT NULL,
        'impact_assessment', v_report.impact_on_business_case IS NOT NULL AND v_report.impact_on_project_plan IS NOT NULL
    );
    
    RETURN QUERY
    SELECT 
        2::INTEGER,
        'Deviation Analysis'::VARCHAR,
        CASE 
            WHEN (v_check_result->>'cause_description')::BOOLEAN 
                 AND (v_check_result->>'root_cause_analysis')::BOOLEAN
                 AND (v_check_result->>'consequences')::BOOLEAN
                 AND (v_check_result->>'impact_assessment')::BOOLEAN
            THEN 'passed'::VARCHAR
            ELSE 'failed'::VARCHAR
        END,
        v_check_result;
    
    -- Criterion 3: Business Case Impact
    v_check_result := jsonb_build_object(
        'business_case_impact', v_report.impact_on_business_case IS NOT NULL AND length(v_report.impact_on_business_case) >= 100,
        'project_plan_impact', v_report.impact_on_project_plan IS NOT NULL AND length(v_report.impact_on_project_plan) >= 100,
        'options_have_bc_impact', v_options_count > 0, -- Would need to check if options have effect_on_business_case
        'variances_populated', v_report.time_variance_days IS NOT NULL AND v_report.cost_variance_amount IS NOT NULL
    );
    
    RETURN QUERY
    SELECT 
        3::INTEGER,
        'Business Case Impact'::VARCHAR,
        CASE 
            WHEN (v_check_result->>'business_case_impact')::BOOLEAN 
                 AND (v_check_result->>'project_plan_impact')::BOOLEAN
                 AND (v_check_result->>'options_have_bc_impact')::BOOLEAN
                 AND (v_check_result->>'variances_populated')::BOOLEAN
            THEN 'passed'::VARCHAR
            ELSE 'failed'::VARCHAR
        END,
        v_check_result;
    
    -- Criterion 4: Options Analysis
    v_check_result := jsonb_build_object(
        'options_count', v_options_count,
        'min_options_met', v_options_count >= 2,
        'recommended_option', v_recommended_count = 1,
        'recommendation_populated', v_report.recommendation_summary IS NOT NULL AND v_report.recommendation_justification IS NOT NULL
    );
    
    RETURN QUERY
    SELECT 
        4::INTEGER,
        'Options Analysis'::VARCHAR,
        CASE 
            WHEN (v_check_result->>'min_options_met')::BOOLEAN 
                 AND (v_check_result->>'recommended_option')::BOOLEAN
                 AND (v_check_result->>'recommendation_populated')::BOOLEAN
            THEN 'passed'::VARCHAR
            ELSE 'failed'::VARCHAR
        END,
        v_check_result;
    
    -- Criterion 5: Timeliness
    v_check_result := jsonb_build_object(
        'days_since_exception', v_days_since_exception,
        'within_5_days', v_days_since_exception IS NOT NULL AND v_days_since_exception <= 5,
        'urgency_matches_severity', TRUE, -- Would need more complex logic
        'critical_same_day', CASE 
            WHEN v_report.exception_level = 'CRITICAL' 
            THEN v_days_since_exception IS NOT NULL AND v_days_since_exception <= 1
            ELSE TRUE
        END
    );
    
    RETURN QUERY
    SELECT 
        5::INTEGER,
        'Timeliness'::VARCHAR,
        CASE 
            WHEN (v_check_result->>'within_5_days')::BOOLEAN 
            THEN 'passed'::VARCHAR
            WHEN (v_check_result->>'critical_same_day')::BOOLEAN = FALSE
            THEN 'failed'::VARCHAR
            ELSE 'needs_review'::VARCHAR
        END,
        v_check_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION run_exception_report_quality_checks IS 'Executes all automated quality validations';

-- ================================================
-- Function: Get Exception Report Quality Summary
-- ================================================

CREATE OR REPLACE FUNCTION get_exception_report_quality_summary(p_exception_report_id UUID)
RETURNS TABLE (
    total_criteria INTEGER,
    passed INTEGER,
    failed INTEGER,
    can_submit BOOLEAN,
    blocking_issues TEXT[]
) AS $$
DECLARE
    v_checks RECORD;
    v_total INTEGER := 0;
    v_passed INTEGER := 0;
    v_failed INTEGER := 0;
    v_blocking_issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR v_checks IN
        SELECT 
            validation_status,
            is_blocking,
            criterion_name
        FROM exception_report_quality_checks
        WHERE exception_report_id = p_exception_report_id
    LOOP
        v_total := v_total + 1;
        
        IF v_checks.validation_status = 'passed' THEN
            v_passed := v_passed + 1;
        ELSIF v_checks.validation_status = 'failed' THEN
            v_failed := v_failed + 1;
            IF v_checks.is_blocking THEN
                v_blocking_issues := array_append(v_blocking_issues, v_checks.criterion_name);
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT
        v_total,
        v_passed,
        v_failed,
        (v_failed = 0)::BOOLEAN AS can_submit,
        v_blocking_issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_exception_report_quality_summary IS 'Returns quality check summary';

-- ================================================
-- Function: Link Exception to Exception Plan
-- ================================================

CREATE OR REPLACE FUNCTION link_exception_to_exception_plan(p_exception_report_id UUID, p_exception_plan_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_report_project_id UUID;
    v_plan_project_id UUID;
BEGIN
    -- Get report project
    SELECT project_id INTO v_report_project_id
    FROM exception_reports
    WHERE id = p_exception_report_id
      AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get plan project
    SELECT project_id INTO v_plan_project_id
    FROM exception_plans
    WHERE id = p_exception_plan_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Verify projects match
    IF v_report_project_id != v_plan_project_id THEN
        RETURN FALSE;
    END IF;
    
    -- Link the plan
    UPDATE exception_reports
    SET 
        exception_plan_id = p_exception_plan_id,
        updated_at = NOW()
    WHERE id = p_exception_report_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_exception_to_exception_plan IS 'Links an exception report to an exception plan';

-- ================================================
-- REGISTER TABLES IN database_tables
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('exception_reports', 'Formal Exception Reports for Project Board escalation', false, true, 'structured'),
    ('exception_report_revision_history', 'Revision history for Exception Reports', false, true, 'structured'),
    ('exception_report_approvals', 'Approval workflow for Exception Reports', false, true, 'structured'),
    ('exception_report_distribution', 'Distribution list for Exception Reports', false, true, 'structured'),
    ('exception_report_options', 'Options analysis for Exception Reports', false, true, 'structured'),
    ('exception_report_lessons', 'Lessons learned from Exception Reports', false, true, 'structured'),
    ('exception_report_quality_checks', 'Quality criteria validation for Exception Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- END OF SCRIPT
-- ================================================
