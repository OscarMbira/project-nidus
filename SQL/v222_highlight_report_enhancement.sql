-- ============================================================================
-- Highlight Report CRUD Enhancement
-- SQL Version: v222
-- Date: 2026-01-20
-- Related: v194_Highlight_Report_CRUD_Implementation_Plan.md
-- Prerequisites: v23_structured_pm_cs.sql (highlight_reports, stage_tolerances),
--   v10 (stage_boundaries), v25 (issues), v26 (risks), v30 (lessons_learned),
--   v31 (change_requests), v169 (lessons_logs), projects, users
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE hlr_variable_status_enum AS ENUM ('on_track', 'at_risk', 'off_track', 'exception');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_period_type_enum AS ENUM ('completed_this_period', 'planned_next_period', 'carried_forward');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_completion_status_enum AS ENUM ('completed', 'in-progress', 'not-started', 'on-hold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_quality_status_enum AS ENUM ('approved', 'pending-approval', 'off-specification', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_risk_category_enum AS ENUM ('key_risk', 'new_risk', 'updated_risk', 'closed_risk');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_issue_category_enum AS ENUM ('key_issue', 'new_issue', 'updated_issue', 'resolved_issue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_issue_priority_enum AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_change_status_enum AS ENUM ('approved', 'pending', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_tolerance_status_enum AS ENUM ('within_tolerance', 'approaching_tolerance', 'exceeded_tolerance', 'exception');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_decision_priority_enum AS ENUM ('urgent', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_decision_status_enum AS ENUM ('pending', 'acknowledged', 'decided', 'deferred');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_distribution_status_enum AS ENUM ('sent', 'delivered', 'read', 'acknowledged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_lesson_type_enum AS ENUM ('what_went_well', 'what_could_improve', 'recommendation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hlr_workflow_status_enum AS ENUM ('draft', 'submitted', 'distributed', 'acknowledged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 2: ALTER EXISTING highlight_reports TABLE
-- ============================================================================

ALTER TABLE highlight_reports
    ADD COLUMN IF NOT EXISTS version_no VARCHAR(20) DEFAULT '1.0',
    ADD COLUMN IF NOT EXISTS report_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS frequency VARCHAR(50),
    ADD COLUMN IF NOT EXISTS next_report_due_date DATE,
    ADD COLUMN IF NOT EXISTS time_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS time_summary TEXT,
    ADD COLUMN IF NOT EXISTS time_forecast TEXT,
    ADD COLUMN IF NOT EXISTS cost_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cost_summary TEXT,
    ADD COLUMN IF NOT EXISTS cost_forecast TEXT,
    ADD COLUMN IF NOT EXISTS quality_status_six VARCHAR(50),
    ADD COLUMN IF NOT EXISTS quality_summary TEXT,
    ADD COLUMN IF NOT EXISTS quality_forecast TEXT,
    ADD COLUMN IF NOT EXISTS scope_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS scope_summary TEXT,
    ADD COLUMN IF NOT EXISTS scope_forecast TEXT,
    ADD COLUMN IF NOT EXISTS benefits_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS benefits_summary TEXT,
    ADD COLUMN IF NOT EXISTS benefits_forecast TEXT,
    ADD COLUMN IF NOT EXISTS risk_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS risk_summary TEXT,
    ADD COLUMN IF NOT EXISTS risk_forecast TEXT,
    ADD COLUMN IF NOT EXISTS tolerance_breaches_summary TEXT,
    ADD COLUMN IF NOT EXISTS tolerance_warnings_summary TEXT,
    ADD COLUMN IF NOT EXISTS escalation_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
    ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS milestones_completed INTEGER,
    ADD COLUMN IF NOT EXISTS milestones_total INTEGER,
    ADD COLUMN IF NOT EXISTS work_packages_completed INTEGER,
    ADD COLUMN IF NOT EXISTS work_packages_total INTEGER,
    ADD COLUMN IF NOT EXISTS distribution_list JSONB,
    ADD COLUMN IF NOT EXISTS approval_workflow_status VARCHAR(50) DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS distributed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS distribution_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS related_checkpoint_report_ids UUID[],
    ADD COLUMN IF NOT EXISTS related_change_request_ids UUID[];

-- Rename existing quality_status to avoid clash: v23 has quality_status TEXT. We added quality_status_six.
-- Keep v23 quality_status as-is (quality issues text). Doc uses quality_status_six for six variables.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'highlight_reports_report_reference_key') THEN
        ALTER TABLE highlight_reports ADD CONSTRAINT highlight_reports_report_reference_key UNIQUE (report_reference);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_highlight_reports_report_reference_not_null
    ON highlight_reports(report_reference) WHERE report_reference IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_highlight_reports_approval_workflow ON highlight_reports(approval_workflow_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_highlight_reports_frequency ON highlight_reports(frequency) WHERE is_deleted = FALSE;

COMMENT ON COLUMN highlight_reports.version_no IS 'Document version (e.g. 1.0, 1.1)';
COMMENT ON COLUMN highlight_reports.report_reference IS 'Unique reference e.g. HLR-PROJ001-STAGE1-001';
COMMENT ON COLUMN highlight_reports.approval_workflow_status IS 'draft, submitted, distributed, acknowledged';

-- ============================================================================
-- SECTION 3: highlight_report_revision_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlight_report_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    highlight_report_id UUID NOT NULL REFERENCES highlight_reports(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    version_number VARCHAR(20) NOT NULL,
    previous_version_number VARCHAR(20),
    summary_of_changes TEXT,
    changes_marked TEXT,
    revised_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hlr_revision_report_id ON highlight_report_revision_history(highlight_report_id);
CREATE INDEX IF NOT EXISTS idx_hlr_revision_version ON highlight_report_revision_history(highlight_report_id, version_number);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_report_revision_history', 'Revision history for Highlight Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, table_category = EXCLUDED.table_category, updated_at = NOW();

-- ============================================================================
-- SECTION 4: highlight_report_products
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlight_report_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    highlight_report_id UUID NOT NULL REFERENCES highlight_reports(id) ON DELETE CASCADE,
    product_id UUID,
    product_name VARCHAR(500),
    product_description TEXT,
    period_type VARCHAR(50) NOT NULL DEFAULT 'completed_this_period',
    completion_status VARCHAR(50) DEFAULT 'not-started',
    quality_status VARCHAR(50),
    completion_date DATE,
    planned_completion_date DATE,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hlr_products_report_id ON highlight_report_products(highlight_report_id);
CREATE INDEX IF NOT EXISTS idx_hlr_products_period ON highlight_report_products(highlight_report_id, period_type);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_report_products', 'Products/deliverables per highlight report', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, table_category = EXCLUDED.table_category, updated_at = NOW();

-- ============================================================================
-- SECTION 5: highlight_report_risks
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlight_report_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    highlight_report_id UUID NOT NULL REFERENCES highlight_reports(id) ON DELETE CASCADE,
    risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
    risk_title VARCHAR(500),
    risk_description TEXT,
    risk_category VARCHAR(50),
    probability VARCHAR(50),
    impact VARCHAR(50),
    risk_score INTEGER,
    current_status TEXT,
    mitigation_actions TEXT,
    escalation_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hlr_risks_report_id ON highlight_report_risks(highlight_report_id);
CREATE INDEX IF NOT EXISTS idx_hlr_risks_risk_id ON highlight_report_risks(risk_id) WHERE risk_id IS NOT NULL;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_report_risks', 'Key risks per highlight report', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, table_category = EXCLUDED.table_category, updated_at = NOW();

-- ============================================================================
-- SECTION 6: highlight_report_issues
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlight_report_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    highlight_report_id UUID NOT NULL REFERENCES highlight_reports(id) ON DELETE CASCADE,
    issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
    issue_title VARCHAR(500),
    issue_description TEXT,
    issue_category VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium',
    current_status TEXT,
    resolution_actions TEXT,
    escalation_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hlr_issues_report_id ON highlight_report_issues(highlight_report_id);
CREATE INDEX IF NOT EXISTS idx_hlr_issues_issue_id ON highlight_report_issues(issue_id) WHERE issue_id IS NOT NULL;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_report_issues', 'Key issues per highlight report', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, table_category = EXCLUDED.table_category, updated_at = NOW();

-- ============================================================================
-- SECTION 7: highlight_report_change_requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlight_report_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    highlight_report_id UUID NOT NULL REFERENCES highlight_reports(id) ON DELETE CASCADE,
    change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL,
    change_title VARCHAR(500),
    change_description TEXT,
    change_status VARCHAR(50) DEFAULT 'pending',
    change_type VARCHAR(50),
    impact_summary TEXT,
    decision_date DATE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hlr_changes_report_id ON highlight_report_change_requests(highlight_report_id);
CREATE INDEX IF NOT EXISTS idx_hlr_changes_cr_id ON highlight_report_change_requests(change_request_id) WHERE change_request_id IS NOT NULL;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_report_change_requests', 'Change requests referenced in highlight report', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, table_category = EXCLUDED.table_category, updated_at = NOW();

-- ============================================================================
-- SECTION 8: highlight_report_tolerances
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlight_report_tolerances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    highlight_report_id UUID NOT NULL REFERENCES highlight_reports(id) ON DELETE CASCADE,
    tolerance_id UUID REFERENCES stage_tolerances(id) ON DELETE SET NULL,
    tolerance_type VARCHAR(50) NOT NULL,
    current_value DECIMAL(12,2),
    baseline_value DECIMAL(12,2),
    tolerance_limit DECIMAL(12,2),
    variance DECIMAL(12,2),
    variance_percentage DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'within_tolerance',
    status_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hlr_tolerances_report_id ON highlight_report_tolerances(highlight_report_id);
CREATE INDEX IF NOT EXISTS idx_hlr_tolerances_tolerance_id ON highlight_report_tolerances(tolerance_id) WHERE tolerance_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_hlr_tolerances_report_tolerance_unique
    ON highlight_report_tolerances(highlight_report_id, tolerance_id) WHERE tolerance_id IS NOT NULL;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_report_tolerances', 'Tolerance snapshot per highlight report', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, table_category = EXCLUDED.table_category, updated_at = NOW();

-- ============================================================================
-- SECTION 9: highlight_report_decisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlight_report_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    highlight_report_id UUID NOT NULL REFERENCES highlight_reports(id) ON DELETE CASCADE,
    decision_title VARCHAR(500) NOT NULL,
    decision_description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    decision_type VARCHAR(50),
    recommended_action TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    decision_date DATE,
    decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    decision_notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hlr_decisions_report_id ON highlight_report_decisions(highlight_report_id);
CREATE INDEX IF NOT EXISTS idx_hlr_decisions_status ON highlight_report_decisions(highlight_report_id, status);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_report_decisions', 'Decisions required from board', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, table_category = EXCLUDED.table_category, updated_at = NOW();

-- ============================================================================
-- SECTION 10: highlight_report_distribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlight_report_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    highlight_report_id UUID NOT NULL REFERENCES highlight_reports(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200),
    recipient_email VARCHAR(255),
    recipient_title VARCHAR(200),
    recipient_role VARCHAR(100),
    date_distributed DATE,
    version_distributed VARCHAR(20),
    distribution_method VARCHAR(50),
    distribution_status VARCHAR(50) DEFAULT 'sent',
    acknowledged_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hlr_distribution_report_id ON highlight_report_distribution(highlight_report_id);
CREATE INDEX IF NOT EXISTS idx_hlr_distribution_recipient ON highlight_report_distribution(recipient_id) WHERE recipient_id IS NOT NULL;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_report_distribution', 'Distribution list for highlight reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, table_category = EXCLUDED.table_category, updated_at = NOW();

-- ============================================================================
-- SECTION 11: highlight_report_lessons
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlight_report_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    highlight_report_id UUID NOT NULL REFERENCES highlight_reports(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons_learned(id) ON DELETE SET NULL,
    lesson_title VARCHAR(500),
    lesson_description TEXT,
    lesson_type VARCHAR(50),
    category VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hlr_lessons_report_id ON highlight_report_lessons(highlight_report_id);
CREATE INDEX IF NOT EXISTS idx_hlr_lessons_lesson_id ON highlight_report_lessons(lesson_id) WHERE lesson_id IS NOT NULL;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_report_lessons', 'Lessons learned referenced in highlight report', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, table_category = EXCLUDED.table_category, updated_at = NOW();

-- ============================================================================
-- SECTION 12: DATABASE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_highlight_report_reference(
    p_project_id UUID,
    p_stage_boundary_id UUID,
    p_report_date DATE
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_code VARCHAR(50);
    v_stage_num INTEGER := 0;
    v_report_count INTEGER;
    v_ref VARCHAR(100);
BEGIN
    SELECT COALESCE(project_code, 'PROJ' || SUBSTRING(p_project_id::TEXT, 1, 8)) INTO v_project_code
    FROM projects WHERE id = p_project_id;

    IF p_stage_boundary_id IS NOT NULL THEN
        SELECT stage_number INTO v_stage_num FROM stage_boundaries WHERE id = p_stage_boundary_id;
    END IF;
    v_stage_num := COALESCE(v_stage_num, 1);

    SELECT COUNT(*) + 1 INTO v_report_count
    FROM highlight_reports
    WHERE project_id = p_project_id
      AND (stage_boundary_id = p_stage_boundary_id OR (stage_boundary_id IS NULL AND p_stage_boundary_id IS NULL))
      AND is_deleted = FALSE;

    v_ref := 'HLR-' || UPPER(v_project_code) || '-STAGE' || v_stage_num || '-' || LPAD(v_report_count::TEXT, 3, '0');
    RETURN v_ref;
END;
$$;

COMMENT ON FUNCTION generate_highlight_report_reference IS 'Generates unique HLR reference e.g. HLR-PROJ001-STAGE1-001';

-- get_latest_highlight_report
CREATE OR REPLACE FUNCTION get_latest_highlight_report(p_project_id UUID, p_stage_boundary_id UUID DEFAULT NULL)
RETURNS TABLE (
    report_id UUID,
    report_reference VARCHAR,
    report_date DATE,
    report_title VARCHAR,
    stage_status VARCHAR,
    approval_workflow_status VARCHAR,
    version_no VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        hr.id,
        hr.report_reference,
        hr.report_date,
        hr.report_title,
        hr.stage_status,
        hr.approval_workflow_status,
        hr.version_no
    FROM highlight_reports hr
    WHERE hr.project_id = p_project_id
      AND (p_stage_boundary_id IS NULL OR hr.stage_boundary_id = p_stage_boundary_id)
      AND hr.is_deleted = FALSE
    ORDER BY hr.report_date DESC, hr.created_at DESC
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_latest_highlight_report IS 'Returns most recent highlight report for project/stage';

-- validate_highlight_report_completeness
CREATE OR REPLACE FUNCTION validate_highlight_report_completeness(p_report_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_fields TEXT[],
    completeness_percentage DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report RECORD;
    v_pct DECIMAL := 0;
    v_total INTEGER := 8;
    v_done INTEGER := 0;
BEGIN
    SELECT * INTO v_report FROM highlight_reports WHERE id = p_report_id AND is_deleted = FALSE;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Document info
    IF v_report.report_reference IS NOT NULL AND v_report.report_reference <> '' AND v_report.version_no IS NOT NULL THEN
        v_done := v_done + 1;
        RETURN QUERY SELECT 'document_info'::VARCHAR, TRUE, ARRAY[]::TEXT[], 100.0::DECIMAL;
    ELSE
        RETURN QUERY SELECT 'document_info'::VARCHAR, FALSE,
            ARRAY['report_reference', 'version_no']::TEXT[],
            (CASE WHEN v_report.report_reference IS NOT NULL AND v_report.report_reference <> '' THEN 50.0 ELSE 0.0 END +
             CASE WHEN v_report.version_no IS NOT NULL THEN 50.0 ELSE 0.0 END)::DECIMAL;
    END IF;

    -- Executive summary
    IF v_report.executive_summary IS NOT NULL AND length(trim(v_report.executive_summary)) >= 50 THEN
        v_done := v_done + 1;
        RETURN QUERY SELECT 'executive_summary'::VARCHAR, TRUE, ARRAY[]::TEXT[], 100.0::DECIMAL;
    ELSE
        RETURN QUERY SELECT 'executive_summary'::VARCHAR, FALSE, ARRAY['executive_summary (min 50 chars)']::TEXT[], 0.0::DECIMAL;
    END IF;

    -- Stage status
    IF v_report.stage_status IS NOT NULL AND v_report.stage_status <> '' THEN
        v_done := v_done + 1;
        RETURN QUERY SELECT 'stage_status'::VARCHAR, TRUE, ARRAY[]::TEXT[], 100.0::DECIMAL;
    ELSE
        RETURN QUERY SELECT 'stage_status'::VARCHAR, FALSE, ARRAY['stage_status']::TEXT[], 0.0::DECIMAL;
    END IF;

    -- Six variables (simplified: at least one has status)
    IF v_report.time_status IS NOT NULL OR v_report.cost_status IS NOT NULL OR v_report.quality_status_six IS NOT NULL
       OR v_report.scope_status IS NOT NULL OR v_report.benefits_status IS NOT NULL OR v_report.risk_status IS NOT NULL THEN
        v_done := v_done + 1;
        RETURN QUERY SELECT 'six_variables'::VARCHAR, TRUE, ARRAY[]::TEXT[], 100.0::DECIMAL;
    ELSE
        RETURN QUERY SELECT 'six_variables'::VARCHAR, FALSE, ARRAY['At least one variable status']::TEXT[], 0.0::DECIMAL;
    END IF;

    -- Progress
    IF (v_report.progress_summary IS NOT NULL AND length(trim(v_report.progress_summary)) > 0)
       OR (v_report.completed_this_period IS NOT NULL AND length(trim(v_report.completed_this_period)) > 0)
       OR (v_report.planned_next_period IS NOT NULL AND length(trim(v_report.planned_next_period)) > 0) THEN
        v_done := v_done + 1;
        RETURN QUERY SELECT 'progress'::VARCHAR, TRUE, ARRAY[]::TEXT[], 100.0::DECIMAL;
    ELSE
        RETURN QUERY SELECT 'progress'::VARCHAR, FALSE, ARRAY['progress_summary or completed/planned']::TEXT[], 0.0::DECIMAL;
    END IF;

    -- Risks summary
    IF v_report.risks_summary IS NOT NULL OR (SELECT COUNT(*) FROM highlight_report_risks WHERE highlight_report_id = p_report_id) > 0 THEN
        v_done := v_done + 1;
        RETURN QUERY SELECT 'risks'::VARCHAR, TRUE, ARRAY[]::TEXT[], 100.0::DECIMAL;
    ELSE
        RETURN QUERY SELECT 'risks'::VARCHAR, FALSE, ARRAY['risks_summary or key risks']::TEXT[], 0.0::DECIMAL;
    END IF;

    -- Issues summary
    IF v_report.issues_summary IS NOT NULL OR (SELECT COUNT(*) FROM highlight_report_issues WHERE highlight_report_id = p_report_id) > 0 THEN
        v_done := v_done + 1;
        RETURN QUERY SELECT 'issues'::VARCHAR, TRUE, ARRAY[]::TEXT[], 100.0::DECIMAL;
    ELSE
        RETURN QUERY SELECT 'issues'::VARCHAR, FALSE, ARRAY['issues_summary or key issues']::TEXT[], 0.0::DECIMAL;
    END IF;

    -- Decisions (required if escalation)
    IF v_report.escalation_required = TRUE THEN
        IF (SELECT COUNT(*) FROM highlight_report_decisions WHERE highlight_report_id = p_report_id AND status IN ('pending', 'acknowledged')) > 0
           OR (v_report.decisions_required IS NOT NULL AND length(trim(v_report.decisions_required)) > 0) THEN
            v_done := v_done + 1;
            RETURN QUERY SELECT 'decisions'::VARCHAR, TRUE, ARRAY[]::TEXT[], 100.0::DECIMAL;
        ELSE
            RETURN QUERY SELECT 'decisions'::VARCHAR, FALSE, ARRAY['decisions_required or decision items']::TEXT[], 0.0::DECIMAL;
        END IF;
    ELSE
        v_done := v_done + 1;
        RETURN QUERY SELECT 'decisions'::VARCHAR, TRUE, ARRAY[]::TEXT[], 100.0::DECIMAL;
    END IF;
END;
$$;

COMMENT ON FUNCTION validate_highlight_report_completeness IS 'Validates required sections for highlight report distribution';

-- get_report_statistics
CREATE OR REPLACE FUNCTION get_report_statistics(
    p_project_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_reports INTEGER,
    average_status VARCHAR,
    tolerance_breaches_count INTEGER,
    escalation_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INTEGER;
    v_breaches INTEGER := 0;
    v_escalations INTEGER := 0;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_total
    FROM highlight_reports hr
    WHERE hr.project_id = p_project_id
      AND hr.is_deleted = FALSE
      AND (p_start_date IS NULL OR hr.report_date >= p_start_date)
      AND (p_end_date IS NULL OR hr.report_date <= p_end_date);

    SELECT COUNT(*)::INTEGER INTO v_breaches
    FROM highlight_reports hr
    WHERE hr.project_id = p_project_id
      AND hr.is_deleted = FALSE
      AND (p_start_date IS NULL OR hr.report_date >= p_start_date)
      AND (p_end_date IS NULL OR hr.report_date <= p_end_date)
      AND (hr.tolerance_breaches_summary IS NOT NULL AND length(trim(hr.tolerance_breaches_summary)) > 0);

    SELECT COUNT(*)::INTEGER INTO v_escalations
    FROM highlight_reports hr
    WHERE hr.project_id = p_project_id
      AND hr.is_deleted = FALSE
      AND (p_start_date IS NULL OR hr.report_date >= p_start_date)
      AND (p_end_date IS NULL OR hr.report_date <= p_end_date)
      AND hr.escalation_required = TRUE;

    total_reports := v_total;
    average_status := 'on_track';
    tolerance_breaches_count := v_breaches;
    escalation_count := v_escalations;
    RETURN NEXT;
    RETURN;
END;
$$;

COMMENT ON FUNCTION get_report_statistics IS 'Returns highlight report stats for project in date range';

-- calculate_tolerance_status_for_report: sync from stage_tolerances into highlight_report_tolerances
CREATE OR REPLACE FUNCTION calculate_tolerance_status_for_report(p_report_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report RECORD;
    v_tol RECORD;
BEGIN
    SELECT project_id, stage_boundary_id INTO v_report
    FROM highlight_reports WHERE id = p_report_id AND is_deleted = FALSE;
    IF NOT FOUND THEN RETURN; END IF;

    FOR v_tol IN
        SELECT id, tolerance_type, current_value, baseline_value, tolerance_limit_value,
               variance, variance_percentage, status
        FROM stage_tolerances
        WHERE project_id = v_report.project_id
          AND (v_report.stage_boundary_id IS NULL OR stage_boundary_id = v_report.stage_boundary_id)
          AND is_deleted = FALSE
    LOOP
        INSERT INTO highlight_report_tolerances (
            highlight_report_id, tolerance_id, tolerance_type,
            current_value, baseline_value, tolerance_limit, variance, variance_percentage, status
        ) VALUES (
            p_report_id, v_tol.id, v_tol.tolerance_type,
            v_tol.current_value, v_tol.baseline_value, v_tol.tolerance_limit_value,
            v_tol.variance, v_tol.variance_percentage, COALESCE(v_tol.status, 'within_tolerance')
        )
        ON CONFLICT (highlight_report_id, tolerance_id)
        DO UPDATE SET
            current_value = EXCLUDED.current_value,
            baseline_value = EXCLUDED.baseline_value,
            tolerance_limit = EXCLUDED.tolerance_limit,
            variance = EXCLUDED.variance,
            variance_percentage = EXCLUDED.variance_percentage,
            status = EXCLUDED.status;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION calculate_tolerance_status_for_report IS 'Populates highlight_report_tolerances from stage_tolerances';

-- auto_populate_highlight_report_from_stage: high-level placeholder; app can call sync services
CREATE OR REPLACE FUNCTION auto_populate_highlight_report_from_stage(p_report_id UUID, p_stage_boundary_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_id UUID;
    v_wp_total INTEGER;
    v_wp_done INTEGER;
BEGIN
    SELECT project_id INTO v_project_id FROM highlight_reports WHERE id = p_report_id AND is_deleted = FALSE;
    IF NOT FOUND THEN RETURN; END IF;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('completed', 'closed')) INTO v_wp_total, v_wp_done
    FROM work_packages
    WHERE project_id = v_project_id
      AND (p_stage_boundary_id IS NULL OR stage_boundary_id = p_stage_boundary_id)
      AND is_deleted = FALSE;

    UPDATE highlight_reports
    SET work_packages_total = v_wp_total,
        work_packages_completed = v_wp_done,
        progress_percentage = CASE WHEN v_wp_total > 0 THEN (v_wp_done::DECIMAL / v_wp_total * 100) ELSE NULL END,
        stage_boundary_id = COALESCE(stage_boundary_id, p_stage_boundary_id),
        updated_at = NOW()
    WHERE id = p_report_id;

    PERFORM calculate_tolerance_status_for_report(p_report_id);
END;
$$;

COMMENT ON FUNCTION auto_populate_highlight_report_from_stage IS 'Auto-populate progress and tolerances from stage/work packages';

-- ============================================================================
-- SECTION 13: TRIGGERS
-- ============================================================================

-- Auto-generate report_reference on insert when null
CREATE OR REPLACE FUNCTION trg_highlight_report_set_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.report_reference IS NULL OR NEW.report_reference = '' THEN
        NEW.report_reference := generate_highlight_report_reference(
            NEW.project_id,
            NEW.stage_boundary_id,
            COALESCE(NEW.report_date, CURRENT_DATE)
        );
    END IF;
    IF NEW.version_no IS NULL OR NEW.version_no = '' THEN
        NEW.version_no := '1.0';
    END IF;
    IF NEW.approval_workflow_status IS NULL OR NEW.approval_workflow_status = '' THEN
        NEW.approval_workflow_status := 'draft';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_highlight_reports_set_reference ON highlight_reports;
CREATE TRIGGER trg_highlight_reports_set_reference
    BEFORE INSERT ON highlight_reports
    FOR EACH ROW
    EXECUTE FUNCTION trg_highlight_report_set_reference();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM database_tables
    WHERE table_name IN (
        'highlight_report_revision_history', 'highlight_report_products', 'highlight_report_risks',
        'highlight_report_issues', 'highlight_report_change_requests', 'highlight_report_tolerances',
        'highlight_report_decisions', 'highlight_report_distribution', 'highlight_report_lessons'
    ) AND is_deleted = FALSE;
    RAISE NOTICE 'v222_highlight_report_enhancement: % highlight report child tables registered', v_count;
END;
$$;
