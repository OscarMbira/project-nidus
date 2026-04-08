-- ============================================================================
-- Issue Report Implementation - Comprehensive Issue Report Module
-- Version: v201
-- Description: Creates comprehensive Issue Report structure for formal issue handling
-- Date: 2026-01-16
-- ============================================================================
--
-- Purpose:
-- Implements the Issue Report module based on PRINCE2 Issue Report template.
-- An Issue Report is a formal document created for issues that require formal handling
-- (escalation, impact beyond tolerances, or Project Board decision). It provides
-- detailed analysis, options, recommendations, and decision documentation.
--
-- Strategy:
-- 1. Create issue_reports main table (one report per issue, optional one-to-one)
-- 2. Create 4 child tables:
--    - issue_report_options (options analysis)
--    - issue_report_revision_history (version control)
--    - issue_report_approvals (approval workflow)
--    - issue_report_distribution (distribution list)
-- 3. Create functions for reference generation, auto-population, validation
-- 4. Set up triggers for auto-generation and audit
-- 5. Set up RLS policies (in separate file v202)
--
-- Prerequisites:
-- - v174_issue_register_tables.sql must be run first (issues table exists)
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - projects table must exist
-- - users table must exist
-- - issue_registers table exists (v174)
-- - issue_decisions table exists (v174) - for decision linking
--
-- Relationship Design:
-- Optional One-to-One: Each issue can have at most ONE Issue Report
-- - NOT all issues require an Issue Report
-- - Issue Reports created for: Project Board decision, tolerance breach, formal escalation
--
-- ============================================================================
-- SECTION 1: CREATE ISSUE_REPORTS MAIN TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One report per issue - UNIQUE constraint)
    issue_id UUID UNIQUE NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    issue_register_id UUID NOT NULL REFERENCES issue_registers(id) ON DELETE CASCADE,

    -- Document Control
    report_reference VARCHAR(100) UNIQUE NOT NULL, -- e.g., "ISR-PROJ001-ISS-001"
    version_no VARCHAR(20) DEFAULT '1.0', -- Document version number (e.g., "1.0", "1.1")
    report_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Date report was created/issued
    report_status VARCHAR(50) DEFAULT 'draft' CHECK (report_status IN ('draft', 'submitted', 'under_review', 'approved', 'distributed', 'closed')),

    -- Author/Responsibility
    author_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who created/wrote the report
    author_name VARCHAR(200), -- For external authors
    prepared_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who prepared the report
    prepared_by_name VARCHAR(200), -- For external preparers

    -- Issue Summary (Auto-populated from issue, snapshot at creation)
    issue_identifier VARCHAR(50), -- From issue (e.g., ISS-2026-001)
    issue_type VARCHAR(50), -- From issue
    issue_title VARCHAR(500), -- From issue
    issue_description TEXT, -- From issue (snapshot at report creation)

    -- Detailed Impact Analysis
    impact_time TEXT, -- Impact on time/schedule
    impact_cost TEXT, -- Impact on cost/budget
    impact_quality TEXT, -- Impact on quality
    impact_scope TEXT, -- Impact on scope
    impact_benefits TEXT, -- Impact on benefits
    impact_risk TEXT, -- Impact on risk exposure
    affects_stage_tolerances BOOLEAN DEFAULT FALSE, -- Whether affects stage tolerances
    affects_project_tolerances BOOLEAN DEFAULT FALSE, -- Whether affects project tolerances
    tolerance_impact_details TEXT, -- Details of tolerance impact

    -- Options Analysis
    options_analysis TEXT, -- Overall options analysis summary
    recommendation TEXT, -- Recommended option/solution
    recommendation_rationale TEXT, -- Why this option is recommended

    -- Decision
    decision_required BOOLEAN DEFAULT FALSE, -- Whether decision is required
    decision_by VARCHAR(200), -- Who needs to make decision (e.g., "Project Board Executive")
    decision_date DATE, -- When decision was made
    decision_made TEXT, -- What decision was made
    decision_made_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who made the decision
    decision_made_by_name VARCHAR(200), -- For external decision makers
    decision_conditions TEXT, -- Conditions attached to decision
    decision_id UUID REFERENCES issue_decisions(id) ON DELETE SET NULL, -- Link to issue decision record

    -- Closure
    closure_date DATE, -- When issue report was closed
    closure_outcome TEXT, -- Outcome of resolution
    closure_verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who verified closure
    follow_up_required BOOLEAN DEFAULT FALSE, -- Whether follow-up is needed
    follow_up_details TEXT, -- Follow-up action details
    lessons_captured BOOLEAN DEFAULT FALSE, -- Whether lessons were captured
    lessons_summary TEXT, -- Summary of lessons learned

    -- Distribution & Approval (JSONB for flexibility)
    distribution_list JSONB DEFAULT '[]'::jsonb, -- Array of recipients {user_id, name, email, role, date_sent, status}
    submitted_at TIMESTAMPTZ, -- When report was submitted
    submitted_to_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who it was submitted to
    reviewed_at TIMESTAMPTZ, -- When report was reviewed
    reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who reviewed it
    approved_at TIMESTAMPTZ, -- When report was approved
    approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who approved it

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
CREATE INDEX IF NOT EXISTS idx_issue_reports_issue_id ON issue_reports(issue_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_reports_project_id ON issue_reports(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_reports_issue_register_id ON issue_reports(issue_register_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_reports_report_reference ON issue_reports(report_reference) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_reports_report_status ON issue_reports(report_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_reports_decision_required ON issue_reports(decision_required) WHERE decision_required = TRUE AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_reports_is_deleted ON issue_reports(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_issue_reports_before_insert ON issue_reports;
CREATE TRIGGER trg_issue_reports_before_insert
    BEFORE INSERT ON issue_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_issue_reports_before_update ON issue_reports;
CREATE TRIGGER trg_issue_reports_before_update
    BEFORE UPDATE ON issue_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE issue_reports IS 'Issue Report - Formal document for issues requiring formal handling (escalation, tolerance breach, Project Board decision)';
COMMENT ON COLUMN issue_reports.issue_id IS 'One-to-one relationship with issue (optional - not all issues need reports)';
COMMENT ON COLUMN issue_reports.report_reference IS 'Unique report reference (e.g., ISR-PROJ001-ISS-001)';
COMMENT ON COLUMN issue_reports.report_status IS 'Report workflow status: draft, submitted, under_review, approved, distributed, closed';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_reports', 'Issue Report - Formal document for issues requiring formal handling', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 2: CREATE ISSUE_REPORT_OPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_report_options (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    issue_report_id UUID NOT NULL REFERENCES issue_reports(id) ON DELETE CASCADE,

    -- Option Details
    option_number INTEGER NOT NULL, -- Sequential number (1, 2, 3, etc.)
    option_title VARCHAR(500) NOT NULL,
    option_description TEXT,
    pros TEXT, -- Advantages
    cons TEXT, -- Disadvantages
    feasibility TEXT, -- Feasibility assessment
    cost_implications TEXT, -- Cost implications
    time_implications TEXT, -- Time/schedule implications
    risk_implications TEXT, -- Risk implications
    is_recommended BOOLEAN DEFAULT FALSE, -- Whether this is the recommended option
    display_order INTEGER DEFAULT 0, -- For custom ordering

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    -- Note: Only one recommended option per report is enforced by trigger
    -- (trigger_ensure_one_recommended_option) - CHECK constraints cannot use subqueries
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_report_options_report_id ON issue_report_options(issue_report_id);
CREATE INDEX IF NOT EXISTS idx_issue_report_options_display_order ON issue_report_options(issue_report_id, display_order);
CREATE INDEX IF NOT EXISTS idx_issue_report_options_recommended ON issue_report_options(issue_report_id, is_recommended) WHERE is_recommended = TRUE;

-- Triggers
DROP TRIGGER IF EXISTS trg_issue_report_options_before_insert ON issue_report_options;
CREATE TRIGGER trg_issue_report_options_before_insert
    BEFORE INSERT ON issue_report_options
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_issue_report_options_before_update ON issue_report_options;
CREATE TRIGGER trg_issue_report_options_before_update
    BEFORE UPDATE ON issue_report_options
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE issue_report_options IS 'Options analysis for Issue Reports - detailed analysis of each option';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_report_options', 'Options analysis for Issue Reports', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: CREATE ISSUE_REPORT_REVISION_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_report_revision_history (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    issue_report_id UUID NOT NULL REFERENCES issue_reports(id) ON DELETE CASCADE,

    -- Revision Details
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    version_number VARCHAR(20) NOT NULL, -- e.g., "1.0", "1.1", "2.0"
    previous_version_number VARCHAR(20), -- Previous version
    summary_of_changes TEXT, -- Summary of what changed
    changes_marked TEXT, -- Tracked changes/details

    -- Audit Fields
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_report_revision_history_report_id ON issue_report_revision_history(issue_report_id);
CREATE INDEX IF NOT EXISTS idx_issue_report_revision_history_version ON issue_report_revision_history(issue_report_id, version_number);
CREATE INDEX IF NOT EXISTS idx_issue_report_revision_history_date ON issue_report_revision_history(issue_report_id, revision_date DESC);

-- Comments
COMMENT ON TABLE issue_report_revision_history IS 'Revision history for Issue Reports - tracks all version changes';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_report_revision_history', 'Revision history for Issue Reports', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: CREATE ISSUE_REPORT_APPROVALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_report_approvals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    issue_report_id UUID NOT NULL REFERENCES issue_reports(id) ON DELETE CASCADE,

    -- Approver Details
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approver_name VARCHAR(200) NOT NULL, -- For external approvers
    approver_title VARCHAR(200), -- Job title
    approver_role VARCHAR(50), -- 'executive', 'senior-user', 'senior-supplier', 'project-manager', 'other'

    -- Approval Details
    approval_date DATE,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'deferred')),
    approval_comments TEXT,
    conditions TEXT, -- Conditions attached to approval
    signature_data TEXT, -- Digital signature or approval token
    version_approved VARCHAR(20), -- Which version was approved

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_report_approvals_report_id ON issue_report_approvals(issue_report_id);
CREATE INDEX IF NOT EXISTS idx_issue_report_approvals_status ON issue_report_approvals(issue_report_id, approval_status) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_issue_report_approvals_approver ON issue_report_approvals(approver_id) WHERE approval_status = 'pending';

-- Triggers
DROP TRIGGER IF EXISTS trg_issue_report_approvals_before_insert ON issue_report_approvals;
CREATE TRIGGER trg_issue_report_approvals_before_insert
    BEFORE INSERT ON issue_report_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_issue_report_approvals_before_update ON issue_report_approvals;
CREATE TRIGGER trg_issue_report_approvals_before_update
    BEFORE UPDATE ON issue_report_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE issue_report_approvals IS 'Approval workflow for Issue Reports - tracks all approvers and their decisions';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_report_approvals', 'Approval workflow for Issue Reports', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: CREATE ISSUE_REPORT_DISTRIBUTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_report_distribution (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    issue_report_id UUID NOT NULL REFERENCES issue_reports(id) ON DELETE CASCADE,

    -- Recipient Details
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for external recipients
    recipient_name VARCHAR(200) NOT NULL,
    recipient_email VARCHAR(255),
    recipient_title VARCHAR(200),
    recipient_role VARCHAR(200),

    -- Distribution Details
    date_distributed DATE,
    version_distributed VARCHAR(20), -- Which version was distributed
    distribution_method VARCHAR(50), -- 'email', 'system', 'print', 'meeting'
    distribution_status VARCHAR(50) DEFAULT 'sent' CHECK (distribution_status IN ('sent', 'delivered', 'read', 'acknowledged')),
    acknowledged_at TIMESTAMPTZ, -- When recipient acknowledged
    read_at TIMESTAMPTZ, -- When recipient read the report

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_report_distribution_report_id ON issue_report_distribution(issue_report_id);
CREATE INDEX IF NOT EXISTS idx_issue_report_distribution_is_deleted ON issue_report_distribution(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_report_distribution_status ON issue_report_distribution(issue_report_id, distribution_status);
CREATE INDEX IF NOT EXISTS idx_issue_report_distribution_recipient ON issue_report_distribution(recipient_id) WHERE recipient_id IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_issue_report_distribution_before_insert ON issue_report_distribution;
CREATE TRIGGER trg_issue_report_distribution_before_insert
    BEFORE INSERT ON issue_report_distribution
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_issue_report_distribution_before_update ON issue_report_distribution;
CREATE TRIGGER trg_issue_report_distribution_before_update
    BEFORE UPDATE ON issue_report_distribution
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE issue_report_distribution IS 'Distribution list for Issue Reports - tracks who received which version';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_report_distribution', 'Distribution list for Issue Reports', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Generate Issue Report Reference
-- Generates unique report reference (e.g., "ISR-PROJ001-ISS-001")
CREATE OR REPLACE FUNCTION generate_issue_report_reference(p_issue_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_project_ref VARCHAR;
    v_issue_identifier VARCHAR;
    v_report_ref VARCHAR;
    v_counter INTEGER := 1;
BEGIN
    -- Get project reference and issue identifier
    SELECT 
        p.project_reference,
        i.issue_identifier
    INTO 
        v_project_ref,
        v_issue_identifier
    FROM issues i
    JOIN projects p ON i.project_id = p.id
    WHERE i.id = p_issue_id;

    IF v_project_ref IS NULL OR v_issue_identifier IS NULL THEN
        RAISE EXCEPTION 'Could not find project or issue for issue_id %', p_issue_id;
    END IF;

    -- Generate base reference: ISR-{PROJECT_REF}-{ISSUE_IDENTIFIER}
    v_report_ref := 'ISR-' || UPPER(REPLACE(v_project_ref, ' ', '')) || '-' || UPPER(REPLACE(v_issue_identifier, ' ', ''));

    -- Ensure uniqueness (handle edge cases)
    WHILE EXISTS (SELECT 1 FROM issue_reports WHERE report_reference = v_report_ref AND is_deleted = FALSE) LOOP
        v_report_ref := 'ISR-' || UPPER(REPLACE(v_project_ref, ' ', '')) || '-' || UPPER(REPLACE(v_issue_identifier, ' ', '')) || '-' || v_counter::TEXT;
        v_counter := v_counter + 1;
    END LOOP;

    RETURN v_report_ref;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_issue_report_reference(UUID) IS 'Generates unique Issue Report reference (e.g., ISR-PROJ001-ISS-001)';

-- Function: Auto-populate Issue Report from Issue
-- Populates Issue Report data from linked issue
CREATE OR REPLACE FUNCTION auto_populate_issue_report_from_issue(p_report_id UUID, p_issue_id UUID)
RETURNS VOID AS $$
DECLARE
    v_issue RECORD;
BEGIN
    -- Get issue details
    SELECT 
        i.issue_identifier,
        i.issue_type,
        i.title as issue_title,
        i.description as issue_description,
        i.priority,
        i.severity,
        i.raised_by_id,
        i.raised_by_name,
        i.author_id,
        i.author_name,
        i.owner_id,
        i.owner_name,
        i.date_raised,
        i.cost_impact,
        i.schedule_impact_days,
        i.quality_impact,
        i.scope_impact,
        i.affects_baseline,
        i.project_id,
        i.issue_register_id
    INTO v_issue
    FROM issues i
    WHERE i.id = p_issue_id
    AND i.is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue not found: %', p_issue_id;
    END IF;

    -- Update report with issue data
    UPDATE issue_reports
    SET
        issue_identifier = v_issue.issue_identifier,
        issue_type = v_issue.issue_type,
        issue_title = v_issue.issue_title,
        issue_description = v_issue.issue_description,
        -- Auto-populate impact fields if available
        impact_cost = CASE 
            WHEN v_issue.cost_impact IS NOT NULL THEN 
                'Estimated cost impact: $' || v_issue.cost_impact::TEXT
            ELSE NULL 
        END,
        impact_time = CASE 
            WHEN v_issue.schedule_impact_days IS NOT NULL THEN 
                'Estimated schedule impact: ' || v_issue.schedule_impact_days::TEXT || ' days'
            ELSE NULL 
        END,
        impact_quality = v_issue.quality_impact,
        impact_scope = v_issue.scope_impact,
        affects_project_tolerances = COALESCE(v_issue.affects_baseline, FALSE),
        author_id = COALESCE(v_issue.author_id, v_issue.raised_by_id),
        author_name = COALESCE(v_issue.author_name, v_issue.raised_by_name),
        report_date = COALESCE(v_issue.date_raised, CURRENT_DATE),
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_report_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

COMMENT ON FUNCTION auto_populate_issue_report_from_issue(UUID, UUID) IS 'Auto-populates Issue Report data from linked issue (snapshot at creation)';

-- Function: Check if Issue Report can be created
-- Returns TRUE if no existing report for the issue
CREATE OR REPLACE FUNCTION can_create_issue_report(p_issue_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM issue_reports 
        WHERE issue_id = p_issue_id 
        AND is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_create_issue_report(UUID) IS 'Checks if an Issue Report can be created for an issue (no existing report)';

-- Function: Link Issue Report to Decision
-- Links Issue Report to an issue decision record
CREATE OR REPLACE FUNCTION link_issue_report_to_decision(p_report_id UUID, p_decision_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Verify decision exists and is linked to same issue
    IF NOT EXISTS (
        SELECT 1 FROM issue_decisions id
        JOIN issue_reports ir ON id.issue_id = ir.issue_id
        WHERE id.id = p_decision_id
        AND ir.id = p_report_id
        AND id.is_deleted = FALSE
        AND ir.is_deleted = FALSE
    ) THEN
        RAISE EXCEPTION 'Decision % is not linked to the same issue as report %', p_decision_id, p_report_id;
    END IF;

    -- Update report with decision link
    UPDATE issue_reports
    SET
        decision_id = p_decision_id,
        decision_date = (SELECT decision_date FROM issue_decisions WHERE id = p_decision_id),
        decision_made = (SELECT decision_description FROM issue_decisions WHERE id = p_decision_id),
        decision_made_by_id = (SELECT decided_by_id FROM issue_decisions WHERE id = p_decision_id),
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_report_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

COMMENT ON FUNCTION link_issue_report_to_decision(UUID, UUID) IS 'Links Issue Report to an issue decision record';

-- Function: Validate Issue Report Completeness
-- Validates that all required sections are completed before submission
CREATE OR REPLACE FUNCTION validate_issue_report_completeness(p_report_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_fields TEXT[],
    completeness_percentage DECIMAL
) AS $$
DECLARE
    v_report RECORD;
    v_total_fields INTEGER;
    v_complete_fields INTEGER;
    v_missing TEXT[];
BEGIN
    -- Get report
    SELECT * INTO v_report
    FROM issue_reports
    WHERE id = p_report_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue Report not found: %', p_report_id;
    END IF;

    -- Validate Document Information section
    v_missing := ARRAY[]::TEXT[];
    IF v_report.report_reference IS NULL OR v_report.report_reference = '' THEN
        v_missing := array_append(v_missing, 'report_reference');
    END IF;
    IF v_report.report_date IS NULL THEN
        v_missing := array_append(v_missing, 'report_date');
    END IF;
    IF v_report.author_id IS NULL AND (v_report.author_name IS NULL OR v_report.author_name = '') THEN
        v_missing := array_append(v_missing, 'author');
    END IF;

    v_total_fields := 3;
    v_complete_fields := v_total_fields - array_length(v_missing, 1);
    RETURN QUERY SELECT 
        'Document Information'::VARCHAR,
        (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
        COALESCE(v_missing, ARRAY[]::TEXT[]),
        ROUND((v_complete_fields::DECIMAL / v_total_fields::DECIMAL) * 100, 2);

    -- Validate Impact Analysis section (required if affects tolerances)
    v_missing := ARRAY[]::TEXT[];
    IF v_report.affects_stage_tolerances OR v_report.affects_project_tolerances THEN
        IF (v_report.impact_time IS NULL OR v_report.impact_time = '') AND
           (v_report.impact_cost IS NULL OR v_report.impact_cost = '') AND
           (v_report.impact_quality IS NULL OR v_report.impact_quality = '') AND
           (v_report.impact_scope IS NULL OR v_report.impact_scope = '') AND
           (v_report.impact_benefits IS NULL OR v_report.impact_benefits = '') AND
           (v_report.impact_risk IS NULL OR v_report.impact_risk = '') THEN
            v_missing := array_append(v_missing, 'at_least_one_impact_field');
        END IF;
    END IF;
    IF v_report.tolerance_impact_details IS NULL OR v_report.tolerance_impact_details = '' THEN
        IF v_report.affects_stage_tolerances OR v_report.affects_project_tolerances THEN
            v_missing := array_append(v_missing, 'tolerance_impact_details');
        END IF;
    END IF;

    v_total_fields := CASE 
        WHEN v_report.affects_stage_tolerances OR v_report.affects_project_tolerances THEN 7
        ELSE 0
    END;
    v_complete_fields := v_total_fields - array_length(v_missing, 1);
    RETURN QUERY SELECT 
        'Impact Analysis'::VARCHAR,
        (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
        COALESCE(v_missing, ARRAY[]::TEXT[]),
        CASE WHEN v_total_fields > 0 THEN ROUND((v_complete_fields::DECIMAL / v_total_fields::DECIMAL) * 100, 2) ELSE 100.0 END;

    -- Validate Options & Recommendations section (required if decision is required)
    DECLARE
        v_option_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_option_count
        FROM issue_report_options
        WHERE issue_report_id = p_report_id;

        v_missing := ARRAY[]::TEXT[];
        IF v_report.decision_required THEN
            IF v_option_count = 0 THEN
                v_missing := array_append(v_missing, 'at_least_one_option');
            END IF;
            IF v_report.recommendation IS NULL OR v_report.recommendation = '' THEN
                v_missing := array_append(v_missing, 'recommendation');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM issue_report_options WHERE issue_report_id = p_report_id AND is_recommended = TRUE) THEN
                v_missing := array_append(v_missing, 'recommended_option');
            END IF;
        END IF;

        v_total_fields := CASE WHEN v_report.decision_required THEN 3 ELSE 0 END;
        v_complete_fields := v_total_fields - array_length(v_missing, 1);
        RETURN QUERY SELECT 
            'Options & Recommendations'::VARCHAR,
            (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
            COALESCE(v_missing, ARRAY[]::TEXT[]),
            CASE WHEN v_total_fields > 0 THEN ROUND((v_complete_fields::DECIMAL / v_total_fields::DECIMAL) * 100, 2) ELSE 100.0 END;
    END;

    -- Validate Decision section (required if decision_required is true)
    v_missing := ARRAY[]::TEXT[];
    IF v_report.decision_required THEN
        IF v_report.decision_by IS NULL OR v_report.decision_by = '' THEN
            v_missing := array_append(v_missing, 'decision_by');
        END IF;
        -- If report is being closed, decision must be made
        IF v_report.report_status = 'closed' THEN
            IF v_report.decision_made IS NULL OR v_report.decision_made = '' THEN
                v_missing := array_append(v_missing, 'decision_made');
            END IF;
            IF v_report.decision_date IS NULL THEN
                v_missing := array_append(v_missing, 'decision_date');
            END IF;
        END IF;
    END IF;

    v_total_fields := CASE WHEN v_report.decision_required THEN 3 ELSE 0 END;
    v_complete_fields := v_total_fields - array_length(v_missing, 1);
    RETURN QUERY SELECT 
        'Decision'::VARCHAR,
        (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
        COALESCE(v_missing, ARRAY[]::TEXT[]),
        CASE WHEN v_total_fields > 0 THEN ROUND((v_complete_fields::DECIMAL / v_total_fields::DECIMAL) * 100, 2) ELSE 100.0 END;

    -- Validate Closure section (required if status is 'closed')
    v_missing := ARRAY[]::TEXT[];
    IF v_report.report_status = 'closed' THEN
        IF v_report.closure_date IS NULL THEN
            v_missing := array_append(v_missing, 'closure_date');
        END IF;
        IF v_report.closure_outcome IS NULL OR v_report.closure_outcome = '' THEN
            v_missing := array_append(v_missing, 'closure_outcome');
        END IF;
    END IF;

    v_total_fields := CASE WHEN v_report.report_status = 'closed' THEN 2 ELSE 0 END;
    v_complete_fields := v_total_fields - array_length(v_missing, 1);
    RETURN QUERY SELECT 
        'Closure'::VARCHAR,
        (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0)::BOOLEAN,
        COALESCE(v_missing, ARRAY[]::TEXT[]),
        CASE WHEN v_total_fields > 0 THEN ROUND((v_complete_fields::DECIMAL / v_total_fields::DECIMAL) * 100, 2) ELSE 100.0 END;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_issue_report_completeness(UUID) IS 'Validates that all required sections are completed before submission';

-- Function: Get Issue Reports Requiring Decision
-- Returns Issue Reports requiring Project Board decision
CREATE OR REPLACE FUNCTION get_issue_reports_requiring_decision(p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
    report_id UUID,
    report_reference VARCHAR,
    issue_identifier VARCHAR,
    issue_title VARCHAR,
    decision_by VARCHAR,
    days_waiting INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ir.id,
        ir.report_reference,
        ir.issue_identifier,
        ir.issue_title,
        ir.decision_by,
        EXTRACT(DAY FROM (NOW() - COALESCE(ir.submitted_at, ir.created_at)))::INTEGER as days_waiting
    FROM issue_reports ir
    WHERE ir.decision_required = TRUE
    AND ir.report_status IN ('submitted', 'under_review')
    AND (ir.decision_date IS NULL OR ir.decision_made IS NULL)
    AND ir.is_deleted = FALSE
    AND (p_project_id IS NULL OR ir.project_id = p_project_id)
    ORDER BY COALESCE(ir.submitted_at, ir.created_at) ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_issue_reports_requiring_decision(UUID) IS 'Returns Issue Reports requiring Project Board decision';

-- ============================================================================
-- SECTION 7: TRIGGERS FOR AUTO-GENERATION
-- ============================================================================

-- Trigger: Auto-generate report reference on creation
CREATE OR REPLACE FUNCTION trigger_auto_generate_issue_report_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if not provided
    IF NEW.report_reference IS NULL OR NEW.report_reference = '' THEN
        NEW.report_reference := generate_issue_report_reference(NEW.issue_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_reports_auto_generate_reference ON issue_reports;
CREATE TRIGGER trg_issue_reports_auto_generate_reference
    BEFORE INSERT ON issue_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_generate_issue_report_reference();

-- Trigger: Auto-populate from issue on creation
CREATE OR REPLACE FUNCTION trigger_auto_populate_issue_report()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate issue details on creation
    PERFORM auto_populate_issue_report_from_issue(NEW.id, NEW.issue_id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log warning but don't fail insert
        RAISE WARNING 'Failed to auto-populate issue report % from issue %: %', NEW.id, NEW.issue_id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_reports_auto_populate ON issue_reports;
CREATE TRIGGER trg_issue_reports_auto_populate
    AFTER INSERT ON issue_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_populate_issue_report();

-- Trigger: Ensure only one recommended option per report
CREATE OR REPLACE FUNCTION trigger_ensure_one_recommended_option()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this option as recommended, unset others
    IF NEW.is_recommended = TRUE THEN
        UPDATE issue_report_options
        SET is_recommended = FALSE
        WHERE issue_report_id = NEW.issue_report_id
        AND id != NEW.id
        AND is_recommended = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_report_options_one_recommended ON issue_report_options;
CREATE TRIGGER trg_issue_report_options_one_recommended
    BEFORE INSERT OR UPDATE ON issue_report_options
    FOR EACH ROW
    WHEN (NEW.is_recommended = TRUE)
    EXECUTE FUNCTION trigger_ensure_one_recommended_option();

-- ============================================================================
-- END OF FILE
-- ============================================================================
