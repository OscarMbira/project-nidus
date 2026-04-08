-- ============================================================================
-- Checkpoint Report Enhancement - Comprehensive Checkpoint Report Module
-- Version: v191
-- Description: Enhances existing checkpoint_reports table and adds comprehensive CRUD functionality
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Enhances the existing checkpoint_reports table (from v23_structured_pm_cs.sql) with
-- full CRUD operations based on Structured PM methodology template. This feature
-- allows Team Managers to create periodic checkpoint reports for Work Packages,
-- providing status updates to the Project Manager during stage execution.
--
-- Strategy:
-- 1. ALTER existing checkpoint_reports table to add new columns
-- 2. Create 8 supporting tables:
--    - checkpoint_report_revision_history (version control)
--    - checkpoint_report_approvals (approval workflow)
--    - checkpoint_report_distribution (distribution list)
--    - checkpoint_report_products (products tracking)
--    - checkpoint_report_quality_activities (quality activities)
--    - checkpoint_report_follow_ups (follow-up items)
--    - checkpoint_report_lessons (lessons identified)
--    - checkpoint_report_quality_checks (quality criteria validation)
-- 3. Create functions for reference generation, carry-forward, quality checks
-- 4. Set up triggers for auto-generation and audit
-- 5. Set up RLS policies (in separate file v192)
--
-- Prerequisites:
-- - v23_structured_pm_cs.sql must be run first (checkpoint_reports table exists)
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - projects table must exist
-- - users table must exist
-- - work_packages table exists (v23)
-- - stage_tolerances table exists (v23)
-- - lessons_logs table exists (v169) - for lessons escalation
--
-- Relationship Design:
-- One-to-Many: Each Work Package can have multiple Checkpoint Reports
-- - Reports created at intervals defined by the Project Manager
-- - Each report covers a specific reporting period
-- - Follow-ups from previous reports must be addressed
--
-- ============================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ============================================================================

-- Tolerance status enum
DO $$ BEGIN
    CREATE TYPE checkpoint_tolerance_status_enum AS ENUM ('within', 'approaching', 'exceeded');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Product status enum
DO $$ BEGIN
    CREATE TYPE checkpoint_product_status_enum AS ENUM ('in_development', 'completed', 'quality_check', 'approved');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Period type enum
DO $$ BEGIN
    CREATE TYPE checkpoint_period_type_enum AS ENUM ('current', 'next');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Quality status enum
DO $$ BEGIN
    CREATE TYPE checkpoint_quality_status_enum AS ENUM ('not_started', 'in_progress', 'passed', 'failed', 'waived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Quality activity type enum
DO $$ BEGIN
    CREATE TYPE checkpoint_quality_activity_type_enum AS ENUM ('review', 'inspection', 'test', 'audit', 'other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Quality activity status enum
DO $$ BEGIN
    CREATE TYPE checkpoint_quality_activity_status_enum AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Follow-up type enum
DO $$ BEGIN
    CREATE TYPE checkpoint_follow_up_type_enum AS ENUM ('action', 'issue', 'risk', 'decision', 'other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Follow-up status enum
DO $$ BEGIN
    CREATE TYPE checkpoint_follow_up_status_enum AS ENUM ('open', 'in_progress', 'completed', 'cancelled', 'carried_forward');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Lesson type enum
DO $$ BEGIN
    CREATE TYPE checkpoint_lesson_type_enum AS ENUM ('positive', 'negative', 'suggestion');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Lesson category enum
DO $$ BEGIN
    CREATE TYPE checkpoint_lesson_category_enum AS ENUM ('process', 'technical', 'resource', 'communication', 'quality', 'other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Lesson impact enum
DO $$ BEGIN
    CREATE TYPE checkpoint_lesson_impact_enum AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Approval status enum
DO $$ BEGIN
    CREATE TYPE checkpoint_approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Distribution status enum
DO $$ BEGIN
    CREATE TYPE checkpoint_distribution_status_enum AS ENUM ('sent', 'read', 'acknowledged');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Quality check validation status enum
DO $$ BEGIN
    CREATE TYPE checkpoint_quality_check_status_enum AS ENUM ('not_checked', 'passed', 'failed', 'needs_review', 'manual_override');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 2: ALTER EXISTING checkpoint_reports TABLE
-- ============================================================================

-- Add new columns to checkpoint_reports table
ALTER TABLE checkpoint_reports
    -- Document Metadata
    ADD COLUMN IF NOT EXISTS version_no VARCHAR(20) DEFAULT '1.0',
    ADD COLUMN IF NOT EXISTS document_ref VARCHAR(100),
    ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Reporting Period
    ADD COLUMN IF NOT EXISTS period_start_date DATE,
    ADD COLUMN IF NOT EXISTS period_end_date DATE,
    ADD COLUMN IF NOT EXISTS date_of_this_revision DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS date_of_next_revision DATE,
    
    -- Follow-Ups and Planning
    ADD COLUMN IF NOT EXISTS follow_ups_summary TEXT,
    ADD COLUMN IF NOT EXISTS next_period_products_developing TEXT,
    ADD COLUMN IF NOT EXISTS next_period_products_completing TEXT,
    ADD COLUMN IF NOT EXISTS next_period_quality_activities TEXT,
    ADD COLUMN IF NOT EXISTS lessons_summary TEXT,
    
    -- Tolerance Status
    ADD COLUMN IF NOT EXISTS tolerance_time_status checkpoint_tolerance_status_enum,
    ADD COLUMN IF NOT EXISTS tolerance_cost_status checkpoint_tolerance_status_enum,
    ADD COLUMN IF NOT EXISTS tolerance_scope_status checkpoint_tolerance_status_enum,
    
    -- Actual and Forecast Values
    ADD COLUMN IF NOT EXISTS time_actual INTEGER, -- Actual time spent (days)
    ADD COLUMN IF NOT EXISTS time_forecast INTEGER, -- Forecasted remaining time (days)
    ADD COLUMN IF NOT EXISTS cost_actual DECIMAL(12,2), -- Actual cost spent
    ADD COLUMN IF NOT EXISTS cost_forecast DECIMAL(12,2), -- Forecasted remaining cost
    ADD COLUMN IF NOT EXISTS scope_actual_percentage DECIMAL(5,2), -- Actual scope completed (0-100)
    ADD COLUMN IF NOT EXISTS scope_forecast_percentage DECIMAL(5,2); -- Forecasted scope completion (0-100)

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_document_ref ON checkpoint_reports(document_ref) WHERE is_deleted = FALSE AND document_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_version_no ON checkpoint_reports(version_no) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_author_id ON checkpoint_reports(author_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_owner_id ON checkpoint_reports(owner_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_client_id ON checkpoint_reports(client_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_period_dates ON checkpoint_reports(period_start_date, period_end_date) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON COLUMN checkpoint_reports.version_no IS 'Document version number (e.g., "1.0", "1.1")';
COMMENT ON COLUMN checkpoint_reports.document_ref IS 'Unique document reference (e.g., CPR-PROJ001-WP01-001)';
COMMENT ON COLUMN checkpoint_reports.author_id IS 'Report author (usually Team Manager)';
COMMENT ON COLUMN checkpoint_reports.owner_id IS 'Report owner (usually Team Manager)';
COMMENT ON COLUMN checkpoint_reports.client_id IS 'Report client (usually Project Manager)';
COMMENT ON COLUMN checkpoint_reports.period_start_date IS 'Reporting period start date';
COMMENT ON COLUMN checkpoint_reports.period_end_date IS 'Reporting period end date';

-- ============================================================================
-- SECTION 3: CREATE checkpoint_report_revision_history TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_report_revision_history (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    checkpoint_report_id UUID NOT NULL REFERENCES checkpoint_reports(id) ON DELETE CASCADE,

    -- Revision Details
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE, -- Previous revision date
    summary_of_changes TEXT, -- Summary of what changed
    changes_marked TEXT, -- Reference to where changes are marked
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    version_no VARCHAR(20) NOT NULL, -- Version at this revision

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_revision_history_report_id ON checkpoint_report_revision_history(checkpoint_report_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_revision_history_version ON checkpoint_report_revision_history(checkpoint_report_id, version_no);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_revision_history_date ON checkpoint_report_revision_history(checkpoint_report_id, revision_date DESC);

-- Comments
COMMENT ON TABLE checkpoint_report_revision_history IS 'Revision history for Checkpoint Reports - tracks all version changes';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('checkpoint_report_revision_history', 'Revision history for Checkpoint Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: CREATE checkpoint_report_approvals TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_report_approvals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    checkpoint_report_id UUID NOT NULL REFERENCES checkpoint_reports(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Approver Details (cached at time of approval)
    approver_name VARCHAR(200) NOT NULL, -- Cached name at time of approval
    approver_title VARCHAR(200), -- Role/title at time of approval
    signature_data TEXT, -- Digital signature or approval token

    -- Approval Details
    approval_date DATE NOT NULL DEFAULT CURRENT_DATE,
    approval_status checkpoint_approval_status_enum NOT NULL DEFAULT 'pending',
    comments TEXT,
    version_approved VARCHAR(20), -- Version that was approved

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_approvals_report_id ON checkpoint_report_approvals(checkpoint_report_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_approvals_approver_id ON checkpoint_report_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_approvals_status ON checkpoint_report_approvals(checkpoint_report_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_approvals_pending ON checkpoint_report_approvals(checkpoint_report_id, approval_status) WHERE approval_status = 'pending';

-- Comments
COMMENT ON TABLE checkpoint_report_approvals IS 'Approval workflow for Checkpoint Reports - tracks all approvals';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('checkpoint_report_approvals', 'Approval workflow for Checkpoint Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 5: CREATE checkpoint_report_distribution TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_report_distribution (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    checkpoint_report_id UUID NOT NULL REFERENCES checkpoint_reports(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Recipient Details (cached at time of distribution)
    recipient_name VARCHAR(200) NOT NULL, -- Cached name
    recipient_title VARCHAR(200), -- Role/title

    -- Distribution Details
    date_of_issue DATE NOT NULL DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20), -- Version that was distributed
    distribution_status checkpoint_distribution_status_enum NOT NULL DEFAULT 'sent',

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_distribution_report_id ON checkpoint_report_distribution(checkpoint_report_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_distribution_recipient_id ON checkpoint_report_distribution(recipient_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_distribution_status ON checkpoint_report_distribution(checkpoint_report_id, distribution_status);

-- Comments
COMMENT ON TABLE checkpoint_report_distribution IS 'Distribution list for Checkpoint Reports - tracks document distribution';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('checkpoint_report_distribution', 'Distribution list for Checkpoint Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 6: CREATE checkpoint_report_products TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_report_products (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    checkpoint_report_id UUID NOT NULL REFERENCES checkpoint_reports(id) ON DELETE CASCADE,

    -- Product Details
    product_name VARCHAR(500) NOT NULL, -- Name of product/deliverable
    product_description TEXT,
    product_status checkpoint_product_status_enum NOT NULL DEFAULT 'in_development',
    period_type checkpoint_period_type_enum NOT NULL DEFAULT 'current', -- Current reporting period or next

    -- Dates
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Quality
    quality_status checkpoint_quality_status_enum DEFAULT 'not_started',
    quality_notes TEXT,

    -- Ownership
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Product owner

    -- Display
    display_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_products_report_id ON checkpoint_report_products(checkpoint_report_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_products_period_type ON checkpoint_report_products(checkpoint_report_id, period_type);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_products_status ON checkpoint_report_products(checkpoint_report_id, product_status);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_products_display_order ON checkpoint_report_products(checkpoint_report_id, display_order);

-- Triggers
DROP TRIGGER IF EXISTS trg_checkpoint_report_products_before_insert ON checkpoint_report_products;
CREATE TRIGGER trg_checkpoint_report_products_before_insert
    BEFORE INSERT ON checkpoint_report_products
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_checkpoint_report_products_before_update ON checkpoint_report_products;
CREATE TRIGGER trg_checkpoint_report_products_before_update
    BEFORE UPDATE ON checkpoint_report_products
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE checkpoint_report_products IS 'Products/deliverables tracked in Checkpoint Reports';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('checkpoint_report_products', 'Products/deliverables tracked in Checkpoint Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 7: CREATE checkpoint_report_quality_activities TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_report_quality_activities (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    checkpoint_report_id UUID NOT NULL REFERENCES checkpoint_reports(id) ON DELETE CASCADE,

    -- Activity Details
    activity_name VARCHAR(500) NOT NULL,
    activity_description TEXT,
    activity_type checkpoint_quality_activity_type_enum NOT NULL DEFAULT 'review',
    period_type checkpoint_period_type_enum NOT NULL DEFAULT 'current', -- Completed or planned

    -- Dates
    planned_date DATE,
    actual_date DATE,

    -- Status
    status checkpoint_quality_activity_status_enum NOT NULL DEFAULT 'planned',
    outcome TEXT, -- Result of quality activity

    -- Responsibility
    responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Display
    display_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_quality_activities_report_id ON checkpoint_report_quality_activities(checkpoint_report_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_quality_activities_period_type ON checkpoint_report_quality_activities(checkpoint_report_id, period_type);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_quality_activities_status ON checkpoint_report_quality_activities(checkpoint_report_id, status);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_quality_activities_display_order ON checkpoint_report_quality_activities(checkpoint_report_id, display_order);

-- Triggers
DROP TRIGGER IF EXISTS trg_checkpoint_report_quality_activities_before_insert ON checkpoint_report_quality_activities;
CREATE TRIGGER trg_checkpoint_report_quality_activities_before_insert
    BEFORE INSERT ON checkpoint_report_quality_activities
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_checkpoint_report_quality_activities_before_update ON checkpoint_report_quality_activities;
CREATE TRIGGER trg_checkpoint_report_quality_activities_before_update
    BEFORE UPDATE ON checkpoint_report_quality_activities
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE checkpoint_report_quality_activities IS 'Quality management activities for Checkpoint Reports';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('checkpoint_report_quality_activities', 'Quality management activities for Checkpoint Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 8: CREATE checkpoint_report_follow_ups TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_report_follow_ups (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    checkpoint_report_id UUID NOT NULL REFERENCES checkpoint_reports(id) ON DELETE CASCADE,
    source_report_id UUID REFERENCES checkpoint_reports(id) ON DELETE SET NULL, -- Original report if from previous

    -- Follow-Up Details
    follow_up_item TEXT NOT NULL, -- Description of the follow-up item
    follow_up_type checkpoint_follow_up_type_enum NOT NULL DEFAULT 'action',
    original_date DATE, -- Date item was first raised
    status checkpoint_follow_up_status_enum NOT NULL DEFAULT 'open',
    resolution TEXT, -- How it was resolved
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Person responsible
    due_date DATE,
    completion_date DATE,

    -- Display
    display_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_follow_ups_report_id ON checkpoint_report_follow_ups(checkpoint_report_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_follow_ups_source_report_id ON checkpoint_report_follow_ups(source_report_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_follow_ups_status ON checkpoint_report_follow_ups(checkpoint_report_id, status);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_follow_ups_open ON checkpoint_report_follow_ups(checkpoint_report_id, status) WHERE status IN ('open', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_follow_ups_display_order ON checkpoint_report_follow_ups(checkpoint_report_id, display_order);

-- Triggers
DROP TRIGGER IF EXISTS trg_checkpoint_report_follow_ups_before_insert ON checkpoint_report_follow_ups;
CREATE TRIGGER trg_checkpoint_report_follow_ups_before_insert
    BEFORE INSERT ON checkpoint_report_follow_ups
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_checkpoint_report_follow_ups_before_update ON checkpoint_report_follow_ups;
CREATE TRIGGER trg_checkpoint_report_follow_ups_before_update
    BEFORE UPDATE ON checkpoint_report_follow_ups
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE checkpoint_report_follow_ups IS 'Follow-up items from previous Checkpoint Reports';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('checkpoint_report_follow_ups', 'Follow-up items from previous Checkpoint Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 9: CREATE checkpoint_report_lessons TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_report_lessons (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    checkpoint_report_id UUID NOT NULL REFERENCES checkpoint_reports(id) ON DELETE CASCADE,
    lessons_log_id UUID REFERENCES lessons_logs(id) ON DELETE SET NULL, -- Link if escalated

    -- Lesson Details
    lesson_title VARCHAR(500) NOT NULL,
    lesson_description TEXT NOT NULL,
    lesson_type checkpoint_lesson_type_enum NOT NULL DEFAULT 'positive',
    category checkpoint_lesson_category_enum NOT NULL DEFAULT 'other',
    impact checkpoint_lesson_impact_enum NOT NULL DEFAULT 'medium',
    recommendation TEXT,

    -- Escalation
    identified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_escalated BOOLEAN DEFAULT FALSE, -- Escalated to lessons log

    -- Display
    display_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_lessons_report_id ON checkpoint_report_lessons(checkpoint_report_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_lessons_lessons_log_id ON checkpoint_report_lessons(lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_lessons_is_escalated ON checkpoint_report_lessons(checkpoint_report_id, is_escalated) WHERE is_escalated = TRUE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_lessons_display_order ON checkpoint_report_lessons(checkpoint_report_id, display_order);

-- Triggers
DROP TRIGGER IF EXISTS trg_checkpoint_report_lessons_before_insert ON checkpoint_report_lessons;
CREATE TRIGGER trg_checkpoint_report_lessons_before_insert
    BEFORE INSERT ON checkpoint_report_lessons
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_checkpoint_report_lessons_before_update ON checkpoint_report_lessons;
CREATE TRIGGER trg_checkpoint_report_lessons_before_update
    BEFORE UPDATE ON checkpoint_report_lessons
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE checkpoint_report_lessons IS 'Lessons identified during Checkpoint Report period';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('checkpoint_report_lessons', 'Lessons identified during Checkpoint Report period', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 10: CREATE checkpoint_report_quality_checks TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_report_quality_checks (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    checkpoint_report_id UUID NOT NULL REFERENCES checkpoint_reports(id) ON DELETE CASCADE,

    -- Quality Check Details
    criterion_number INTEGER NOT NULL, -- 1 to 5
    criterion_name VARCHAR(500) NOT NULL,
    criterion_description TEXT,
    is_automated BOOLEAN DEFAULT FALSE, -- Can be validated automatically
    validation_status checkpoint_quality_check_status_enum NOT NULL DEFAULT 'not_checked',
    automated_check_result JSONB, -- Details from automated validation
    manual_check_comment TEXT,
    override_reason TEXT, -- Required when status = 'manual_override'
    is_blocking BOOLEAN DEFAULT TRUE, -- Prevents submission if failed

    -- Check Details
    checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    checked_at TIMESTAMPTZ,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_quality_checks_report_id ON checkpoint_report_quality_checks(checkpoint_report_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_quality_checks_criterion_number ON checkpoint_report_quality_checks(checkpoint_report_id, criterion_number);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_quality_checks_status ON checkpoint_report_quality_checks(checkpoint_report_id, validation_status);
CREATE INDEX IF NOT EXISTS idx_checkpoint_report_quality_checks_blocking ON checkpoint_report_quality_checks(checkpoint_report_id, is_blocking, validation_status) WHERE is_blocking = TRUE AND validation_status = 'failed';

-- Unique constraint: one check per criterion per report
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkpoint_report_quality_checks_unique 
ON checkpoint_report_quality_checks(checkpoint_report_id, criterion_number);

-- Comments
COMMENT ON TABLE checkpoint_report_quality_checks IS 'Quality criteria validation for Checkpoint Reports (5 criteria from template)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('checkpoint_report_quality_checks', 'Quality criteria validation for Checkpoint Reports', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 11: DATABASE FUNCTIONS
-- ============================================================================

-- Function: generate_checkpoint_report_ref
-- Generates unique document reference for checkpoint reports
CREATE OR REPLACE FUNCTION generate_checkpoint_report_ref(
    p_project_id UUID,
    p_work_package_id UUID
)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_project_code VARCHAR(50);
    v_wp_code VARCHAR(50);
    v_sequence_num INTEGER;
    v_ref VARCHAR(100);
BEGIN
    -- Get project code
    SELECT COALESCE(project_code, 'PROJ' || SUBSTRING(p_project_id::TEXT, 1, 8))
    INTO v_project_code
    FROM projects
    WHERE id = p_project_id;

    -- Get work package code
    SELECT COALESCE(work_package_code, 'WP' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 2, '0'))
    INTO v_wp_code
    FROM work_packages
    WHERE id = p_work_package_id;

    -- Get next sequence number for this project/work package combination
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(document_ref FROM '(\d+)$') AS INTEGER)
    ), 0) + 1
    INTO v_sequence_num
    FROM checkpoint_reports
    WHERE project_id = p_project_id
        AND (work_package_id = p_work_package_id OR (work_package_id IS NULL AND p_work_package_id IS NULL))
        AND document_ref IS NOT NULL
        AND document_ref ~ '^CPR-.*-\d+$'
        AND is_deleted = FALSE;

    -- Generate reference: CPR-PROJCODE-WPCODE-001
    v_ref := 'CPR-' || UPPER(v_project_code) || '-' || UPPER(v_wp_code) || '-' || LPAD(v_sequence_num::TEXT, 3, '0');

    RETURN v_ref;
END;
$$;

-- Function: get_previous_checkpoint_report
-- Returns the previous checkpoint report for carry-forward items
CREATE OR REPLACE FUNCTION get_previous_checkpoint_report(
    p_project_id UUID,
    p_work_package_id UUID,
    p_current_report_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_previous_report_id UUID;
BEGIN
    SELECT id
    INTO v_previous_report_id
    FROM checkpoint_reports
    WHERE project_id = p_project_id
        AND (work_package_id = p_work_package_id OR (work_package_id IS NULL AND p_work_package_id IS NULL))
        AND id != COALESCE(p_current_report_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND is_deleted = FALSE
    ORDER BY checkpoint_date DESC, created_at DESC
    LIMIT 1;

    RETURN v_previous_report_id;
END;
$$;

-- Function: carry_forward_open_items
-- Copies open follow-up items from previous report to new report
CREATE OR REPLACE FUNCTION carry_forward_open_items(
    p_source_report_id UUID,
    p_target_report_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_items_copied INTEGER := 0;
    v_item RECORD;
BEGIN
    -- Copy all open or in_progress follow-up items
    FOR v_item IN
        SELECT *
        FROM checkpoint_report_follow_ups
        WHERE checkpoint_report_id = p_source_report_id
            AND status IN ('open', 'in_progress')
        ORDER BY display_order
    LOOP
        INSERT INTO checkpoint_report_follow_ups (
            checkpoint_report_id,
            source_report_id,
            follow_up_item,
            follow_up_type,
            original_date,
            status,
            owner_id,
            due_date,
            display_order,
            created_by,
            updated_by
        )
        VALUES (
            p_target_report_id,
            p_source_report_id,
            v_item.follow_up_item,
            v_item.follow_up_type,
            COALESCE(v_item.original_date, CURRENT_DATE),
            'carried_forward',
            v_item.owner_id,
            v_item.due_date,
            v_item.display_order,
            v_item.created_by,
            v_item.updated_by
        );

        v_items_copied := v_items_copied + 1;
    END LOOP;

    RETURN v_items_copied;
END;
$$;

-- Function: initialize_checkpoint_quality_checks
-- Creates 5 quality check records for a new checkpoint report
CREATE OR REPLACE FUNCTION initialize_checkpoint_quality_checks(
    p_checkpoint_report_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert 5 quality criteria (from template)
    INSERT INTO checkpoint_report_quality_checks (
        checkpoint_report_id,
        criterion_number,
        criterion_name,
        criterion_description,
        is_automated,
        is_blocking
    ) VALUES
    (
        p_checkpoint_report_id,
        1,
        'Prepared at required frequency',
        'Check if report date falls within expected frequency (defined in work package)',
        TRUE,
        TRUE
    ),
    (
        p_checkpoint_report_id,
        2,
        'Level and frequency appropriate for stage/Work Package',
        'Check work package complexity level and verify reporting frequency matches complexity',
        FALSE,
        FALSE
    ),
    (
        p_checkpoint_report_id,
        3,
        'Information is timely, useful, objective and accurate',
        'All required sections completed (min character counts), report date within 2 days of checkpoint date, at least one product/activity reported',
        FALSE,
        TRUE
    ),
    (
        p_checkpoint_report_id,
        4,
        'Every product in Work Package covered',
        'Cross-reference products in work package definition, all products have status update, no products missing from report',
        TRUE,
        TRUE
    ),
    (
        p_checkpoint_report_id,
        5,
        'Includes update on unresolved issues from previous report',
        'If previous report exists with open items, follow-ups section not empty, all carried-forward items addressed, status update provided for each open item',
        TRUE,
        TRUE
    )
    ON CONFLICT (checkpoint_report_id, criterion_number) DO NOTHING;
END;
$$;

-- Function: run_checkpoint_quality_checks
-- Executes all automated quality validations
CREATE OR REPLACE FUNCTION run_checkpoint_quality_checks(
    p_checkpoint_report_id UUID
)
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
    v_work_package RECORD;
    v_previous_report_id UUID;
    v_open_follow_ups INTEGER;
    v_products_count INTEGER;
    v_wp_products_count INTEGER;
    v_check RECORD;
    v_result JSONB;
BEGIN
    -- Get report details
    SELECT cr.*, wp.checkpoint_frequency, wp.reporting_arrangements
    INTO v_report
    FROM checkpoint_reports cr
    LEFT JOIN work_packages wp ON wp.id = cr.work_package_id
    WHERE cr.id = p_checkpoint_report_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Checkpoint report not found: %', p_checkpoint_report_id;
    END IF;

    -- Get work package details
    SELECT *
    INTO v_work_package
    FROM work_packages
    WHERE id = v_report.work_package_id;

    -- Get previous report
    SELECT get_previous_checkpoint_report(
        v_report.project_id,
        v_report.work_package_id,
        p_checkpoint_report_id
    ) INTO v_previous_report_id;

    -- Count open follow-ups from previous report
    SELECT COUNT(*)
    INTO v_open_follow_ups
    FROM checkpoint_report_follow_ups
    WHERE checkpoint_report_id = COALESCE(v_previous_report_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status IN ('open', 'in_progress');

    -- Count products in report
    SELECT COUNT(*)
    INTO v_products_count
    FROM checkpoint_report_products
    WHERE checkpoint_report_id = p_checkpoint_report_id;

    -- Count products in work package (from products_deliverables array)
    SELECT COALESCE(array_length(products_deliverables, 1), 0)
    INTO v_wp_products_count
    FROM work_packages
    WHERE id = v_report.work_package_id;

    -- Process each quality check
    FOR v_check IN
        SELECT *
        FROM checkpoint_report_quality_checks
        WHERE checkpoint_report_id = p_checkpoint_report_id
        ORDER BY criterion_number
    LOOP
        v_result := '{}'::jsonb;
        validation_status := 'not_checked';

        -- Criterion 1: Prepared at required frequency
        IF v_check.criterion_number = 1 AND v_check.is_automated THEN
            -- Check if checkpoint_date is within expected frequency
            -- This is a simplified check - actual frequency logic would be more complex
            IF v_report.checkpoint_date <= CURRENT_DATE THEN
                validation_status := 'passed';
                v_result := jsonb_build_object('message', 'Checkpoint date is valid');
            ELSE
                validation_status := 'failed';
                v_result := jsonb_build_object('message', 'Checkpoint date cannot be in the future');
            END IF;
        END IF;

        -- Criterion 4: Every product in Work Package covered
        IF v_check.criterion_number = 4 AND v_check.is_automated THEN
            IF v_products_count >= v_wp_products_count THEN
                validation_status := 'passed';
                v_result := jsonb_build_object(
                    'message', 'All products covered',
                    'products_in_report', v_products_count,
                    'products_in_wp', v_wp_products_count
                );
            ELSE
                validation_status := 'failed';
                v_result := jsonb_build_object(
                    'message', 'Not all products covered',
                    'products_in_report', v_products_count,
                    'products_in_wp', v_wp_products_count
                );
            END IF;
        END IF;

        -- Criterion 5: Includes update on unresolved issues from previous report
        IF v_check.criterion_number = 5 AND v_check.is_automated THEN
            IF v_previous_report_id IS NULL OR v_open_follow_ups = 0 THEN
                validation_status := 'passed';
                v_result := jsonb_build_object('message', 'No previous open items to address');
            ELSE
                -- Check if follow-ups section has items
                SELECT COUNT(*)
                INTO v_open_follow_ups
                FROM checkpoint_report_follow_ups
                WHERE checkpoint_report_id = p_checkpoint_report_id
                    AND source_report_id = v_previous_report_id;

                IF v_open_follow_ups > 0 THEN
                    validation_status := 'passed';
                    v_result := jsonb_build_object('message', 'Previous items addressed', 'items_addressed', v_open_follow_ups);
                ELSE
                    validation_status := 'failed';
                    v_result := jsonb_build_object('message', 'Previous open items not addressed');
                END IF;
            END IF;
        END IF;

        -- Update the check record
        UPDATE checkpoint_report_quality_checks
        SET validation_status = validation_status::checkpoint_quality_check_status_enum,
            automated_check_result = v_result,
            checked_at = NOW()
        WHERE id = v_check.id;

        -- Return result
        RETURN QUERY SELECT
            v_check.criterion_number,
            v_check.criterion_name,
            validation_status,
            v_result;
    END LOOP;
END;
$$;

-- Function: get_checkpoint_quality_summary
-- Returns quality check summary and completion status
CREATE OR REPLACE FUNCTION get_checkpoint_quality_summary(
    p_checkpoint_report_id UUID
)
RETURNS TABLE (
    total_criteria INTEGER,
    passed INTEGER,
    failed INTEGER,
    needs_review INTEGER,
    not_checked INTEGER,
    completion_percentage DECIMAL,
    can_submit BOOLEAN,
    blocking_issues TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total INTEGER;
    v_passed INTEGER;
    v_failed INTEGER;
    v_needs_review INTEGER;
    v_not_checked INTEGER;
    v_blocking_issues TEXT[];
    v_check RECORD;
BEGIN
    -- Count criteria by status
    SELECT
        COUNT(*) FILTER (WHERE validation_status = 'passed'),
        COUNT(*) FILTER (WHERE validation_status = 'failed'),
        COUNT(*) FILTER (WHERE validation_status = 'needs_review'),
        COUNT(*) FILTER (WHERE validation_status = 'not_checked'),
        COUNT(*)
    INTO v_passed, v_failed, v_needs_review, v_not_checked, v_total
    FROM checkpoint_report_quality_checks
    WHERE checkpoint_report_id = p_checkpoint_report_id;

    -- Collect blocking issues
    v_blocking_issues := ARRAY[]::TEXT[];
    FOR v_check IN
        SELECT criterion_name
        FROM checkpoint_report_quality_checks
        WHERE checkpoint_report_id = p_checkpoint_report_id
            AND is_blocking = TRUE
            AND validation_status IN ('failed', 'not_checked')
    LOOP
        v_blocking_issues := array_append(v_blocking_issues, v_check.criterion_name);
    END LOOP;

    -- Can submit if no blocking issues
    can_submit := array_length(v_blocking_issues, 1) IS NULL;

    -- Calculate completion percentage
    completion_percentage := CASE
        WHEN v_total > 0 THEN ((v_passed + v_failed + v_needs_review)::DECIMAL / v_total::DECIMAL * 100)
        ELSE 0
    END;

    RETURN QUERY SELECT
        v_total,
        v_passed,
        v_failed,
        v_needs_review,
        v_not_checked,
        completion_percentage,
        can_submit,
        v_blocking_issues;
END;
$$;

-- Function: get_work_package_tolerance_status
-- Returns current tolerance status for work package (time, cost, scope)
CREATE OR REPLACE FUNCTION get_work_package_tolerance_status(
    p_work_package_id UUID
)
RETURNS TABLE (
    tolerance_type VARCHAR,
    planned_value DECIMAL,
    actual_value DECIMAL,
    forecast_value DECIMAL,
    variance DECIMAL,
    variance_percentage DECIMAL,
    status VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_wp RECORD;
    v_stage_boundary_id UUID;
    v_tolerance RECORD;
BEGIN
    -- Get work package details
    SELECT *
    INTO v_wp
    FROM work_packages
    WHERE id = p_work_package_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get stage boundary ID
    v_stage_boundary_id := v_wp.stage_boundary_id;

    -- Get tolerance records for the stage
    FOR v_tolerance IN
        SELECT *
        FROM stage_tolerances
        WHERE project_id = v_wp.project_id
            AND (stage_boundary_id = v_stage_boundary_id OR (stage_boundary_id IS NULL AND v_stage_boundary_id IS NULL))
            AND tolerance_type IN ('time', 'cost', 'scope')
            AND is_deleted = FALSE
    LOOP
        tolerance_type := v_tolerance.tolerance_type;
        planned_value := v_tolerance.baseline_value;
        actual_value := v_tolerance.current_value;
        forecast_value := v_tolerance.current_value; -- Simplified - would calculate from work package forecast
        variance := v_tolerance.variance;
        variance_percentage := v_tolerance.variance_percentage;
        status := CASE
            WHEN v_tolerance.status = 'exceeded_tolerance' THEN 'exceeded'
            WHEN v_tolerance.status = 'approaching_tolerance' THEN 'approaching'
            ELSE 'within'
        END;

        RETURN NEXT;
    END LOOP;
END;
$$;

-- ============================================================================
-- SECTION 12: TRIGGERS
-- ============================================================================

-- Trigger: Auto-generate document reference on insert
CREATE OR REPLACE FUNCTION trigger_generate_checkpoint_report_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.document_ref IS NULL AND NEW.project_id IS NOT NULL THEN
        NEW.document_ref := generate_checkpoint_report_ref(NEW.project_id, NEW.work_package_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checkpoint_reports_generate_ref ON checkpoint_reports;
CREATE TRIGGER trg_checkpoint_reports_generate_ref
    BEFORE INSERT ON checkpoint_reports
    FOR EACH ROW
    WHEN (NEW.document_ref IS NULL)
    EXECUTE FUNCTION trigger_generate_checkpoint_report_ref();

-- Trigger: Auto-initialize quality checks on report creation
CREATE OR REPLACE FUNCTION trigger_initialize_checkpoint_quality_checks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM initialize_checkpoint_quality_checks(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checkpoint_reports_initialize_quality_checks ON checkpoint_reports;
CREATE TRIGGER trg_checkpoint_reports_initialize_quality_checks
    AFTER INSERT ON checkpoint_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_checkpoint_quality_checks();

-- ============================================================================
-- SECTION 13: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count checkpoint report tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_name LIKE 'checkpoint_report%'
        OR table_name = 'checkpoint_reports';

    RAISE NOTICE 'Checkpoint Report Enhancement: % tables registered', v_tables_count;
END;
$$;
