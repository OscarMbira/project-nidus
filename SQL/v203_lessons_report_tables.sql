-- ============================================================================
-- Lessons Report Tables - Formal Lessons Report CRUD
-- Version: v203
-- Description: Creates formal Lessons Report tables for structured PM methodology
-- Date: 2026-01-16
-- ============================================================================
--
-- Purpose:
-- Implements comprehensive Lessons Report functionality based on PRINCE2/Structured PM
-- methodology. A Lessons Report is a formal document that summarizes lessons learned
-- from a project (or stage) for organizational learning.
--
-- Strategy:
-- 1. Create main lessons_reports table with all required fields
-- 2. Create 6 child tables for supporting data
-- 3. Add database functions for automation
-- 4. Add triggers for auto-generation and validation
-- 5. Full RLS policies for access control
--
-- Prerequisites:
-- - v169_lessons_log_enhancement.sql must be run (lessons_logs table exists)
-- - v30_closing_project.sql must be run (lessons_learned table exists)
-- - v01 through v07 must be run (core tables and trigger functions)
-- - projects table must exist
-- - users table must exist
-- - stage_boundaries table (if stage reports are supported)
--
-- ============================================================================
-- SECTION 1: CREATE LESSONS_REPORTS MAIN TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    lessons_log_id UUID NOT NULL REFERENCES lessons_logs(id) ON DELETE CASCADE,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,
    
    -- Report Type
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('stage', 'project', 'interim')),

    -- Document Control
    report_reference VARCHAR(100) UNIQUE NOT NULL, -- e.g., "LSR-PROJ001-STAGE1-001"
    version_no VARCHAR(20) DEFAULT '1.0',
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reporting_period_start DATE, -- For stage reports
    reporting_period_end DATE, -- For stage reports
    report_status VARCHAR(50) DEFAULT 'draft' CHECK (report_status IN ('draft', 'submitted', 'under_review', 'approved', 'distributed', 'closed')),

    -- Author/Responsibility
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(200),
    prepared_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    prepared_by_name VARCHAR(200),

    -- Overview/Context
    purpose TEXT,
    context TEXT,
    scope TEXT,
    executive_summary TEXT,

    -- Overall Review
    what_went_well_summary TEXT,
    what_did_not_go_well_summary TEXT,
    surprises_unexpected_summary TEXT,
    planned_vs_actual_analysis TEXT,

    -- Review of Measures (Six Variables)
    time_performance_review TEXT,
    cost_performance_review TEXT,
    quality_performance_review TEXT,
    scope_performance_review TEXT,
    risk_performance_review TEXT,
    benefits_performance_review TEXT,
    baseline_vs_actual_analysis TEXT,
    variance_analysis TEXT,

    -- Recommendations Summary
    key_recommendations_summary TEXT,
    process_changes_recommended TEXT,
    documentation_changes_recommended TEXT,
    role_responsibility_changes TEXT,
    organizational_improvements TEXT,

    -- Distribution & Approval
    distribution_list JSONB DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMPTZ,
    submitted_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_reports_project_id ON lessons_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_lessons_reports_lessons_log_id ON lessons_reports(lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_lessons_reports_stage_boundary_id ON lessons_reports(stage_boundary_id) WHERE stage_boundary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_reports_report_type ON lessons_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_lessons_reports_report_status ON lessons_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_lessons_reports_report_reference ON lessons_reports(report_reference);
CREATE INDEX IF NOT EXISTS idx_lessons_reports_report_date ON lessons_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_lessons_reports_is_deleted ON lessons_reports(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_lessons_reports_before_insert ON lessons_reports;
CREATE TRIGGER trg_lessons_reports_before_insert
    BEFORE INSERT ON lessons_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_lessons_reports_before_update ON lessons_reports;
CREATE TRIGGER trg_lessons_reports_before_update
    BEFORE UPDATE ON lessons_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE lessons_reports IS 'Formal Lessons Report documents summarizing lessons learned from projects or stages';
COMMENT ON COLUMN lessons_reports.report_reference IS 'Unique report reference (e.g., LSR-PROJ001-STAGE1-001)';
COMMENT ON COLUMN lessons_reports.report_type IS 'Type of report: stage, project, or interim';
COMMENT ON COLUMN lessons_reports.report_status IS 'Report workflow status: draft, submitted, under_review, approved, distributed, closed';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_reports', 'Formal Lessons Report documents for organizational learning', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 2: CREATE LESSONS_REPORT_LESSONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_report_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lessons_report_id UUID NOT NULL REFERENCES lessons_reports(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons_learned(id) ON DELETE CASCADE,
    inclusion_reason TEXT,
    significance_level VARCHAR(50) CHECK (significance_level IN ('critical', 'high', 'medium', 'low')),
    display_order INTEGER DEFAULT 0,
    section_in_report VARCHAR(100), -- Which section this lesson appears in
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_report_lessons_report_id ON lessons_report_lessons(lessons_report_id);
CREATE INDEX IF NOT EXISTS idx_lessons_report_lessons_lesson_id ON lessons_report_lessons(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_report_lessons_display_order ON lessons_report_lessons(lessons_report_id, display_order);

-- Comments
COMMENT ON TABLE lessons_report_lessons IS 'Lessons included in a specific Lessons Report';
COMMENT ON COLUMN lessons_report_lessons.significance_level IS 'How significant this lesson is for this report';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_report_lessons', 'Lessons included in Lessons Reports', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: CREATE LESSONS_REPORT_RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_report_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lessons_report_id UUID NOT NULL REFERENCES lessons_reports(id) ON DELETE CASCADE,
    recommendation_title VARCHAR(500) NOT NULL,
    recommendation_description TEXT NOT NULL,
    recommendation_type VARCHAR(100), -- 'process', 'documentation', 'role', 'organizational', 'other'
    priority VARCHAR(50) CHECK (priority IN ('high', 'medium', 'low')),
    responsible_party_id UUID REFERENCES users(id) ON DELETE SET NULL,
    responsible_party_name VARCHAR(200),
    target_implementation_date DATE,
    implementation_status VARCHAR(50) DEFAULT 'pending' CHECK (implementation_status IN ('pending', 'in_progress', 'completed', 'deferred', 'cancelled')),
    implementation_notes TEXT,
    effectiveness_assessment TEXT,
    related_lesson_ids UUID[], -- Lessons this recommendation is based on
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_report_recommendations_report_id ON lessons_report_recommendations(lessons_report_id);
CREATE INDEX IF NOT EXISTS idx_lessons_report_recommendations_responsible ON lessons_report_recommendations(responsible_party_id) WHERE responsible_party_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_report_recommendations_status ON lessons_report_recommendations(implementation_status);
CREATE INDEX IF NOT EXISTS idx_lessons_report_recommendations_display_order ON lessons_report_recommendations(lessons_report_id, display_order);

-- Triggers
DROP TRIGGER IF EXISTS trg_lessons_report_recommendations_update ON lessons_report_recommendations;
CREATE TRIGGER trg_lessons_report_recommendations_update
    BEFORE UPDATE ON lessons_report_recommendations
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE lessons_report_recommendations IS 'Recommendations from Lessons Reports with implementation tracking';
COMMENT ON COLUMN lessons_report_recommendations.related_lesson_ids IS 'Array of lesson IDs this recommendation is based on';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_report_recommendations', 'Recommendations from Lessons Reports', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: CREATE LESSONS_REPORT_REVISION_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_report_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lessons_report_id UUID NOT NULL REFERENCES lessons_reports(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    version_number VARCHAR(20) NOT NULL,
    previous_version_number VARCHAR(20),
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT, -- Tracked changes
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_report_revision_history_report_id ON lessons_report_revision_history(lessons_report_id);
CREATE INDEX IF NOT EXISTS idx_lessons_report_revision_history_revision_date ON lessons_report_revision_history(revision_date);

-- Comments
COMMENT ON TABLE lessons_report_revision_history IS 'Revision history for Lessons Reports';
COMMENT ON COLUMN lessons_report_revision_history.changes_marked IS 'Tracked changes between versions';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_report_revision_history', 'Revision history for Lessons Reports', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: CREATE LESSONS_REPORT_APPROVALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_report_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lessons_report_id UUID NOT NULL REFERENCES lessons_reports(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approver_name VARCHAR(200) NOT NULL,
    approver_title VARCHAR(200),
    approver_role VARCHAR(100), -- 'executive', 'senior-user', 'senior-supplier', 'project-manager', 'pmo-admin', 'other'
    approval_date DATE,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'deferred')),
    approval_comments TEXT,
    conditions TEXT,
    signature_data TEXT,
    version_approved VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_report_approvals_report_id ON lessons_report_approvals(lessons_report_id);
CREATE INDEX IF NOT EXISTS idx_lessons_report_approvals_approver_id ON lessons_report_approvals(approver_id) WHERE approver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_report_approvals_status ON lessons_report_approvals(approval_status);

-- Triggers
DROP TRIGGER IF EXISTS trg_lessons_report_approvals_update ON lessons_report_approvals;
CREATE TRIGGER trg_lessons_report_approvals_update
    BEFORE UPDATE ON lessons_report_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE lessons_report_approvals IS 'Approval workflow for Lessons Reports';
COMMENT ON COLUMN lessons_report_approvals.approver_role IS 'Role of approver (executive, senior-user, etc.)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_report_approvals', 'Approval workflow for Lessons Reports', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: CREATE LESSONS_REPORT_DISTRIBUTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_report_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lessons_report_id UUID NOT NULL REFERENCES lessons_reports(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_email VARCHAR(255),
    recipient_title VARCHAR(200),
    recipient_role VARCHAR(200),
    date_distributed DATE DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20),
    distribution_method VARCHAR(50), -- 'email', 'system', 'print', 'meeting'
    distribution_status VARCHAR(50) DEFAULT 'sent' CHECK (distribution_status IN ('sent', 'delivered', 'read', 'acknowledged')),
    acknowledged_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_report_distribution_report_id ON lessons_report_distribution(lessons_report_id);
CREATE INDEX IF NOT EXISTS idx_lessons_report_distribution_recipient_id ON lessons_report_distribution(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_report_distribution_status ON lessons_report_distribution(distribution_status);

-- Comments
COMMENT ON TABLE lessons_report_distribution IS 'Distribution list for Lessons Reports';
COMMENT ON COLUMN lessons_report_distribution.distribution_method IS 'Method used to distribute report';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_report_distribution', 'Distribution list for Lessons Reports', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 7: CREATE LESSONS_REPORT_APPENDICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_report_appendices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lessons_report_id UUID NOT NULL REFERENCES lessons_reports(id) ON DELETE CASCADE,
    appendix_title VARCHAR(500) NOT NULL,
    appendix_type VARCHAR(100), -- 'evidence', 'detailed_lessons', 'charts', 'references', 'other'
    content TEXT,
    document_url TEXT,
    "references" TEXT[], -- References to registers, logs, reports
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_report_appendices_report_id ON lessons_report_appendices(lessons_report_id);
CREATE INDEX IF NOT EXISTS idx_lessons_report_appendices_display_order ON lessons_report_appendices(lessons_report_id, display_order);

-- Triggers
DROP TRIGGER IF EXISTS trg_lessons_report_appendices_update ON lessons_report_appendices;
CREATE TRIGGER trg_lessons_report_appendices_update
    BEFORE UPDATE ON lessons_report_appendices
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE lessons_report_appendices IS 'Appendices and supporting materials for Lessons Reports';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_report_appendices', 'Appendices for Lessons Reports', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 8: DATABASE FUNCTIONS
-- ============================================================================

-- Generate unique Lessons Report reference
CREATE OR REPLACE FUNCTION generate_lessons_report_reference(
    p_project_id UUID,
    p_stage_boundary_id UUID DEFAULT NULL,
    p_report_type VARCHAR DEFAULT 'project'
) RETURNS VARCHAR AS $$
DECLARE
    v_project_code VARCHAR;
    v_stage_number VARCHAR;
    v_year VARCHAR;
    v_sequence INTEGER;
    v_reference VARCHAR;
BEGIN
    -- Get project code
    SELECT project_code INTO v_project_code
    FROM projects
    WHERE id = p_project_id;

    IF v_project_code IS NULL THEN
        v_project_code := UPPER(SUBSTRING(p_project_id::TEXT, 1, 8));
    END IF;

    -- Get stage number if stage report
    IF p_report_type = 'stage' AND p_stage_boundary_id IS NOT NULL THEN
        SELECT 'STAGE' || COALESCE(stage_number::TEXT, '1') INTO v_stage_number
        FROM stage_boundaries
        WHERE id = p_stage_boundary_id;
    ELSE
        v_stage_number := UPPER(p_report_type);
    END IF;

    -- Get year
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

    -- Get next sequence number
    SELECT COALESCE(MAX(
        CASE
            WHEN report_type = p_report_type THEN
                CAST(SUBSTRING(report_reference FROM '([0-9]+)$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1 INTO v_sequence
    FROM lessons_reports
    WHERE project_id = p_project_id
        AND is_deleted = FALSE;

    -- Format: LSR-PROJ001-STAGE1-001 or LSR-PROJ001-PROJECT-001
    v_reference := 'LSR-' || v_project_code || '-' || v_stage_number || '-' || LPAD(v_sequence::TEXT, 3, '0');

    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- Auto-populate Lessons Report from Lessons Log
CREATE OR REPLACE FUNCTION auto_populate_lessons_report_from_log(
    p_report_id UUID,
    p_lessons_log_id UUID,
    p_stage_boundary_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_positive_count INTEGER;
    v_negative_count INTEGER;
    v_total_count INTEGER;
    v_what_went_well TEXT := '';
    v_what_didnt_go_well TEXT := '';
    v_recommendations TEXT := '';
    v_lesson RECORD;
BEGIN
    -- Get lesson counts
    SELECT 
        COUNT(*) FILTER (WHERE effect_type = 'positive'),
        COUNT(*) FILTER (WHERE effect_type = 'negative'),
        COUNT(*)
    INTO v_positive_count, v_negative_count, v_total_count
    FROM lessons_learned
    WHERE lessons_log_id = p_lessons_log_id
        AND is_deleted = FALSE
        AND (p_start_date IS NULL OR lesson_date >= p_start_date)
        AND (p_end_date IS NULL OR lesson_date <= p_end_date);

    -- Build what went well summary from positive lessons
    FOR v_lesson IN
        SELECT lesson_title, what_happened, recommendations
        FROM lessons_learned
        WHERE lessons_log_id = p_lessons_log_id
            AND effect_type = 'positive'
            AND is_deleted = FALSE
            AND (p_start_date IS NULL OR lesson_date >= p_start_date)
            AND (p_end_date IS NULL OR lesson_date <= p_end_date)
        ORDER BY lesson_date DESC
        LIMIT 10
    LOOP
        v_what_went_well := v_what_went_well || 
            E'\n• ' || v_lesson.lesson_title || ': ' || 
            COALESCE(LEFT(v_lesson.what_happened, 200), '') || E'\n';
    END LOOP;

    -- Build what didn't go well summary from negative lessons
    FOR v_lesson IN
        SELECT lesson_title, what_happened, recommendations
        FROM lessons_learned
        WHERE lessons_log_id = p_lessons_log_id
            AND effect_type = 'negative'
            AND is_deleted = FALSE
            AND (p_start_date IS NULL OR lesson_date >= p_start_date)
            AND (p_end_date IS NULL OR lesson_date <= p_end_date)
        ORDER BY lesson_date DESC
        LIMIT 10
    LOOP
        v_what_didnt_go_well := v_what_didnt_go_well || 
            E'\n• ' || v_lesson.lesson_title || ': ' || 
            COALESCE(LEFT(v_lesson.what_happened, 200), '') || E'\n';
    END LOOP;

    -- Update report with summaries
    UPDATE lessons_reports
    SET
        what_went_well_summary = v_what_went_well,
        what_did_not_go_well_summary = v_what_didnt_go_well,
        updated_at = NOW()
    WHERE id = p_report_id;

    -- Insert significant lessons (positive and negative)
    INSERT INTO lessons_report_lessons (lessons_report_id, lesson_id, significance_level, section_in_report, display_order)
    SELECT 
        p_report_id,
        id,
        CASE 
            WHEN priority IN ('high', 'critical') THEN 'high'
            WHEN effect_type = 'positive' AND is_corporate_lesson THEN 'high'
            ELSE 'medium'
        END,
        CASE 
            WHEN effect_type = 'positive' THEN 'What Went Well'
            WHEN effect_type = 'negative' THEN 'What Did Not Go Well'
            ELSE 'Other Lessons'
        END,
        ROW_NUMBER() OVER (ORDER BY lesson_date DESC)
    FROM lessons_learned
    WHERE lessons_log_id = p_lessons_log_id
        AND is_deleted = FALSE
        AND (p_start_date IS NULL OR lesson_date >= p_start_date)
        AND (p_end_date IS NULL OR lesson_date <= p_end_date)
        AND (priority IN ('high', 'critical') OR is_corporate_lesson OR effect_type IN ('positive', 'negative'))
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Check if Lessons Report can be created
CREATE OR REPLACE FUNCTION can_create_lessons_report(
    p_project_id UUID,
    p_stage_boundary_id UUID DEFAULT NULL,
    p_report_type VARCHAR DEFAULT 'project'
) RETURNS BOOLEAN AS $$
DECLARE
    v_lessons_log_exists BOOLEAN;
BEGIN
    -- Check if lessons log exists
    SELECT EXISTS(
        SELECT 1 FROM lessons_logs
        WHERE project_id = p_project_id
            AND is_deleted = FALSE
    ) INTO v_lessons_log_exists;

    IF NOT v_lessons_log_exists THEN
        RETURN FALSE;
    END IF;

    -- Check if stage boundary exists (for stage reports)
    IF p_report_type = 'stage' AND p_stage_boundary_id IS NOT NULL THEN
        IF NOT EXISTS(SELECT 1 FROM stage_boundaries WHERE id = p_stage_boundary_id) THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Validate Lessons Report completeness
CREATE OR REPLACE FUNCTION validate_lessons_report_completeness(p_report_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_fields TEXT[],
    completeness_percentage DECIMAL
) AS $$
DECLARE
    v_report RECORD;
    v_sections_complete INTEGER := 0;
    v_total_sections INTEGER := 8;
    v_missing_fields TEXT[];
BEGIN
    -- Get report data
    SELECT * INTO v_report
    FROM lessons_reports
    WHERE id = p_report_id AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Check Overview section
    v_missing_fields := ARRAY[]::TEXT[];
    IF v_report.purpose IS NULL OR v_report.purpose = '' THEN
        v_missing_fields := array_append(v_missing_fields, 'purpose');
    END IF;
    IF v_report.executive_summary IS NULL OR v_report.executive_summary = '' THEN
        v_missing_fields := array_append(v_missing_fields, 'executive_summary');
    END IF;
    section_name := 'Overview & Context';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := CASE WHEN is_complete THEN 100.0 ELSE 0.0 END;
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Check Overall Review section
    v_missing_fields := ARRAY[]::TEXT[];
    IF (v_report.what_went_well_summary IS NULL OR v_report.what_went_well_summary = '') AND
       (v_report.what_did_not_go_well_summary IS NULL OR v_report.what_did_not_go_well_summary = '') THEN
        v_missing_fields := array_append(v_missing_fields, 'overall_review');
    END IF;
    section_name := 'Overall Review';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := CASE WHEN is_complete THEN 100.0 ELSE 50.0 END;
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Check Review of Measures (at least 3 variables)
    v_missing_fields := ARRAY[]::TEXT[];
    DECLARE
        v_variables_complete INTEGER := 0;
    BEGIN
        IF v_report.time_performance_review IS NOT NULL AND v_report.time_performance_review != '' THEN
            v_variables_complete := v_variables_complete + 1;
        END IF;
        IF v_report.cost_performance_review IS NOT NULL AND v_report.cost_performance_review != '' THEN
            v_variables_complete := v_variables_complete + 1;
        END IF;
        IF v_report.quality_performance_review IS NOT NULL AND v_report.quality_performance_review != '' THEN
            v_variables_complete := v_variables_complete + 1;
        END IF;
        IF v_report.scope_performance_review IS NOT NULL AND v_report.scope_performance_review != '' THEN
            v_variables_complete := v_variables_complete + 1;
        END IF;
        IF v_report.risk_performance_review IS NOT NULL AND v_report.risk_performance_review != '' THEN
            v_variables_complete := v_variables_complete + 1;
        END IF;
        IF v_report.benefits_performance_review IS NOT NULL AND v_report.benefits_performance_review != '' THEN
            v_variables_complete := v_variables_complete + 1;
        END IF;
        
        IF v_variables_complete < 3 THEN
            v_missing_fields := array_append(v_missing_fields, 'measures_review (need at least 3)');
        END IF;
    END;
    section_name := 'Review of Measures';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := LEAST(100.0, (v_variables_complete::DECIMAL / 6.0) * 100.0);
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Check Significant Lessons
    DECLARE
        v_lessons_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_lessons_count
        FROM lessons_report_lessons
        WHERE lessons_report_id = p_report_id;
        
        IF v_lessons_count = 0 THEN
            v_missing_fields := array_append(v_missing_fields, 'significant_lessons');
        END IF;
    END;
    section_name := 'Significant Lessons';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := CASE WHEN is_complete THEN 100.0 ELSE 0.0 END;
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Check Recommendations
    DECLARE
        v_recommendations_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_recommendations_count
        FROM lessons_report_recommendations
        WHERE lessons_report_id = p_report_id;
        
        IF v_recommendations_count = 0 THEN
            v_missing_fields := array_append(v_missing_fields, 'recommendations');
        END IF;
    END;
    section_name := 'Recommendations';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := CASE WHEN is_complete THEN 100.0 ELSE 0.0 END;
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Overall completeness
    section_name := 'Overall';
    is_complete := v_sections_complete >= 5;
    completeness_percentage := (v_sections_complete::DECIMAL / v_total_sections::DECIMAL) * 100.0;
    missing_fields := ARRAY[]::TEXT[];
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Get Lessons Report statistics
CREATE OR REPLACE FUNCTION get_lessons_report_statistics(p_project_id UUID)
RETURNS TABLE (
    total_reports INTEGER,
    stage_reports INTEGER,
    project_reports INTEGER,
    latest_report_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_reports,
        COUNT(*) FILTER (WHERE report_type = 'stage')::INTEGER as stage_reports,
        COUNT(*) FILTER (WHERE report_type = 'project')::INTEGER as project_reports,
        MAX(report_date) as latest_report_date
    FROM lessons_reports
    WHERE project_id = p_project_id
        AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate report reference
CREATE OR REPLACE FUNCTION trigger_auto_generate_lessons_report_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.report_reference IS NULL OR NEW.report_reference = '' THEN
        NEW.report_reference := generate_lessons_report_reference(
            NEW.project_id,
            NEW.stage_boundary_id,
            NEW.report_type
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lessons_reports_auto_generate_reference
    BEFORE INSERT ON lessons_reports
    FOR EACH ROW
    WHEN (NEW.report_reference IS NULL OR NEW.report_reference = '')
    EXECUTE FUNCTION trigger_auto_generate_lessons_report_reference();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
