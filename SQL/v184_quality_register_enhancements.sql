-- ============================================================================
-- Quality Register Activity Enhancement - Database Schema
-- Version: v184
-- Description: Enhances quality_reviews and quality_inspections tables with PDF template fields
--              and creates supporting tables for quality activity management
-- Date: 2026-01-16
-- ============================================================================
--
-- Purpose:
-- This script enhances the existing quality management tables to fully support the Quality Register
-- template structure. It adds missing fields, creates supporting tables for records and actions,
-- and implements reassessment tracking and QMS integration.
--
-- Prerequisites:
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v32_quality_management.sql must be run (quality_reviews, quality_inspections tables)
-- - v180_quality_management_strategy_tables.sql must be run (QMS tables)
-- - projects table must exist
-- - users table must exist
-- - programmes table must exist (if used)
--
-- ============================================================================
-- SECTION 1: ENHANCE quality_reviews TABLE
-- ============================================================================

-- Add PDF template fields to quality_reviews
DO $$
BEGIN
    -- Activity identifier
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'activity_identifier'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN activity_identifier VARCHAR(50);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_reviews_activity_identifier_unique 
        ON quality_reviews(activity_identifier) WHERE is_deleted = FALSE AND activity_identifier IS NOT NULL;
    END IF;

    -- Programme context
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'programme_id'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_reviews_programme_id ON quality_reviews(programme_id) WHERE is_deleted = FALSE;
    END IF;

    -- Forecast dates
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'forecast_date'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN forecast_date DATE;
    END IF;

    -- Sign-off date planning
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'sign_off_planned_date'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN sign_off_planned_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'sign_off_forecast_date'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN sign_off_forecast_date DATE;
    END IF;

    -- Quality records references
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'quality_records_refs'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN quality_records_refs JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Reassessment tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'parent_review_id'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN parent_review_id UUID REFERENCES quality_reviews(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_reviews_parent_review_id ON quality_reviews(parent_review_id) WHERE is_deleted = FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'is_reassessment'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN is_reassessment BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_quality_reviews_is_reassessment ON quality_reviews(is_reassessment) WHERE is_reassessment = TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'reassessment_count'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN reassessment_count INTEGER DEFAULT 0;
    END IF;

    -- QMS Integration
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'qms_id'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN qms_id UUID REFERENCES quality_management_strategies(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_reviews_qms_id ON quality_reviews(qms_id) WHERE is_deleted = FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'qms_method_id'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN qms_method_id UUID REFERENCES qms_quality_methods(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_reviews_qms_method_id ON quality_reviews(qms_method_id) WHERE is_deleted = FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews' AND column_name = 'qms_scheduled_activity_id'
    ) THEN
        ALTER TABLE quality_reviews ADD COLUMN qms_scheduled_activity_id UUID REFERENCES qms_scheduled_activities(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_reviews_qms_scheduled_activity_id ON quality_reviews(qms_scheduled_activity_id) WHERE is_deleted = FALSE;
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: ENHANCE quality_inspections TABLE
-- ============================================================================

-- Add PDF template fields to quality_inspections
DO $$
BEGIN
    -- Activity identifier
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'activity_identifier'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN activity_identifier VARCHAR(50);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_inspections_activity_identifier_unique 
        ON quality_inspections(activity_identifier) WHERE is_deleted = FALSE AND activity_identifier IS NOT NULL;
    END IF;

    -- Programme context
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'programme_id'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_inspections_programme_id ON quality_inspections(programme_id) WHERE is_deleted = FALSE;
    END IF;

    -- Forecast dates
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'forecast_date'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN forecast_date DATE;
    END IF;

    -- Sign-off date planning
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'sign_off_planned_date'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN sign_off_planned_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'sign_off_forecast_date'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN sign_off_forecast_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'sign_off_actual_date'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN sign_off_actual_date DATE;
    END IF;

    -- Quality records references
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'quality_records_refs'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN quality_records_refs JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Reassessment tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'parent_inspection_id'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN parent_inspection_id UUID REFERENCES quality_inspections(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_inspections_parent_inspection_id ON quality_inspections(parent_inspection_id) WHERE is_deleted = FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'is_reassessment'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN is_reassessment BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_quality_inspections_is_reassessment ON quality_inspections(is_reassessment) WHERE is_reassessment = TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'reassessment_count'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN reassessment_count INTEGER DEFAULT 0;
    END IF;

    -- QMS Integration
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'qms_id'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN qms_id UUID REFERENCES quality_management_strategies(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_inspections_qms_id ON quality_inspections(qms_id) WHERE is_deleted = FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'qms_method_id'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN qms_method_id UUID REFERENCES qms_quality_methods(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_inspections_qms_method_id ON quality_inspections(qms_method_id) WHERE is_deleted = FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_inspections' AND column_name = 'qms_scheduled_activity_id'
    ) THEN
        ALTER TABLE quality_inspections ADD COLUMN qms_scheduled_activity_id UUID REFERENCES qms_scheduled_activities(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_quality_inspections_qms_scheduled_activity_id ON quality_inspections(qms_scheduled_activity_id) WHERE is_deleted = FALSE;
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: CREATE quality_activity_records TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_activity_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Link to activity (polymorphic)
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('review', 'inspection', 'audit', 'test')),
    activity_id UUID NOT NULL,

    -- Record details
    record_type VARCHAR(100) NOT NULL, -- 'test_plan', 'action_list', 'evidence', 'report', 'checklist', 'meeting_minutes'
    record_reference VARCHAR(200),
    record_title VARCHAR(300) NOT NULL,
    record_description TEXT,
    record_url VARCHAR(500),
    document_id UUID, -- FK to document storage if exists

    -- Metadata
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_activity_records_activity ON quality_activity_records(activity_type, activity_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quality_activity_records_type ON quality_activity_records(record_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quality_activity_records_reference ON quality_activity_records(record_reference) WHERE is_deleted = false AND record_reference IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_activity_records_updated_at ON quality_activity_records;
CREATE TRIGGER trg_quality_activity_records_updated_at
    BEFORE UPDATE ON quality_activity_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE quality_activity_records IS 'Quality records (test plans, checklists, evidence, reports) linked to quality activities';

-- ============================================================================
-- SECTION 4: CREATE quality_activity_actions TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_activity_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Link to activity (polymorphic)
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('review', 'inspection', 'audit', 'test')),
    activity_id UUID NOT NULL,

    -- Action details
    action_reference VARCHAR(50),
    action_description TEXT NOT NULL,
    action_type VARCHAR(50) DEFAULT 'corrective' CHECK (action_type IN ('corrective', 'preventive', 'improvement', 'observation')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),

    -- Assignment
    assigned_to_id UUID REFERENCES users(id),
    due_date DATE,

    -- Status tracking
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'verified', 'closed', 'cancelled')),
    completion_date DATE,
    completion_notes TEXT,
    verified_by_id UUID REFERENCES users(id),
    verification_date DATE,
    verification_notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_activity_actions_activity ON quality_activity_actions(activity_type, activity_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quality_activity_actions_assigned ON quality_activity_actions(assigned_to_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quality_activity_actions_status ON quality_activity_actions(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quality_activity_actions_due ON quality_activity_actions(due_date) WHERE is_deleted = false AND status NOT IN ('completed', 'verified', 'closed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_quality_activity_actions_priority ON quality_activity_actions(priority) WHERE is_deleted = false;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_activity_actions_updated_at ON quality_activity_actions;
CREATE TRIGGER trg_quality_activity_actions_updated_at
    BEFORE UPDATE ON quality_activity_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE quality_activity_actions IS 'Action items (corrective, preventive, improvement) resulting from quality activities';

-- ============================================================================
-- SECTION 5: CREATE quality_inspection_participants TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_inspection_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    inspection_id UUID NOT NULL REFERENCES quality_inspections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role
    participant_role VARCHAR(100), -- 'inspector', 'presenter', 'observer', 'auditor', 'subject_matter_expert'
    responsibilities TEXT,

    -- Attendance
    attendance_status VARCHAR(50) DEFAULT 'invited' CHECK (attendance_status IN ('invited', 'confirmed', 'attended', 'absent')),
    attendance_notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT quality_inspection_participants_unique UNIQUE (inspection_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_inspection_participants_inspection ON quality_inspection_participants(inspection_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quality_inspection_participants_user ON quality_inspection_participants(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quality_inspection_participants_role ON quality_inspection_participants(participant_role) WHERE is_deleted = false;

-- Triggers
DROP TRIGGER IF EXISTS trg_quality_inspection_participants_updated_at ON quality_inspection_participants;
CREATE TRIGGER trg_quality_inspection_participants_updated_at
    BEFORE UPDATE ON quality_inspection_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE quality_inspection_participants IS 'Participants in quality inspections (extends participant tracking to inspections)';

-- ============================================================================
-- SECTION 6: CREATE FUNCTIONS
-- ============================================================================

-- Generate unique activity identifier
CREATE OR REPLACE FUNCTION generate_quality_activity_identifier()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get max sequence from both reviews and inspections
    SELECT COALESCE(MAX(seq), 0) + 1 INTO v_sequence
    FROM (
        SELECT CAST(
            CASE 
                WHEN activity_identifier ~ '^QA-' || v_year || '-\d+$' THEN
                    CAST(SUBSTRING(activity_identifier FROM 'QA-' || v_year || '-(\d+)$') AS INTEGER)
                ELSE NULL
            END AS INTEGER
        ) as seq
        FROM quality_reviews
        WHERE activity_identifier IS NOT NULL
          AND activity_identifier LIKE 'QA-' || v_year || '-%'
        UNION ALL
        SELECT CAST(
            CASE 
                WHEN activity_identifier ~ '^QA-' || v_year || '-\d+$' THEN
                    CAST(SUBSTRING(activity_identifier FROM 'QA-' || v_year || '-(\d+)$') AS INTEGER)
                ELSE NULL
            END AS INTEGER
        ) as seq
        FROM quality_inspections
        WHERE activity_identifier IS NOT NULL
          AND activity_identifier LIKE 'QA-' || v_year || '-%'
    ) combined
    WHERE seq IS NOT NULL;

    RETURN 'QA-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_quality_activity_identifier() IS 'Generates unique quality activity identifier in format QA-YYYY-NNNN';

-- Trigger function for reviews
CREATE OR REPLACE FUNCTION trg_quality_reviews_generate_identifier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.activity_identifier IS NULL OR NEW.activity_identifier = '' THEN
        NEW.activity_identifier := generate_quality_activity_identifier();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quality_reviews_identifier ON quality_reviews;
CREATE TRIGGER trg_quality_reviews_identifier
    BEFORE INSERT ON quality_reviews
    FOR EACH ROW
    EXECUTE FUNCTION trg_quality_reviews_generate_identifier();

-- Trigger function for inspections
CREATE OR REPLACE FUNCTION trg_quality_inspections_generate_identifier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.activity_identifier IS NULL OR NEW.activity_identifier = '' THEN
        NEW.activity_identifier := generate_quality_activity_identifier();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quality_inspections_identifier ON quality_inspections;
CREATE TRIGGER trg_quality_inspections_identifier
    BEFORE INSERT ON quality_inspections
    FOR EACH ROW
    EXECUTE FUNCTION trg_quality_inspections_generate_identifier();

-- Create reassessment function
CREATE OR REPLACE FUNCTION create_quality_reassessment(
    p_activity_type VARCHAR(50),
    p_activity_id UUID,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
    v_review RECORD;
    v_inspection RECORD;
BEGIN
    IF p_activity_type = 'review' THEN
        SELECT * INTO v_review
        FROM quality_reviews
        WHERE id = p_activity_id
          AND is_deleted = FALSE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Review not found';
        END IF;

        -- Create new review as reassessment
        INSERT INTO quality_reviews (
            project_id, quality_register_id, programme_id,
            review_title, review_type, review_scope,
            planned_date, chair_user_id, secretary_user_id,
            review_criteria, pass_threshold,
            parent_review_id, is_reassessment,
            qms_id, qms_method_id, qms_scheduled_activity_id,
            created_by
        )
        VALUES (
            v_review.project_id, v_review.quality_register_id, v_review.programme_id,
            COALESCE(v_review.review_title, 'Review') || ' (Reassessment)', 
            v_review.review_type, v_review.review_scope,
            CURRENT_DATE, v_review.chair_user_id, v_review.secretary_user_id,
            v_review.review_criteria, v_review.pass_threshold,
            v_review.id, true,
            v_review.qms_id, v_review.qms_method_id, v_review.qms_scheduled_activity_id,
            p_user_id
        )
        RETURNING id INTO v_new_id;

        -- Update reassessment count on parent
        UPDATE quality_reviews
        SET reassessment_count = COALESCE(reassessment_count, 0) + 1,
            updated_at = NOW(),
            updated_by = p_user_id
        WHERE id = p_activity_id;

    ELSIF p_activity_type = 'inspection' THEN
        SELECT * INTO v_inspection
        FROM quality_inspections
        WHERE id = p_activity_id
          AND is_deleted = FALSE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Inspection not found';
        END IF;

        -- Create new inspection as reassessment
        INSERT INTO quality_inspections (
            project_id, quality_register_id, programme_id,
            inspection_title, inspection_type, inspection_scope,
            inspection_date, inspector_user_id,
            inspection_criteria,
            parent_inspection_id, is_reassessment,
            qms_id, qms_method_id, qms_scheduled_activity_id,
            created_by
        )
        VALUES (
            v_inspection.project_id, v_inspection.quality_register_id, v_inspection.programme_id,
            COALESCE(v_inspection.inspection_title, 'Inspection') || ' (Reassessment)', 
            v_inspection.inspection_type, v_inspection.inspection_scope,
            CURRENT_DATE, v_inspection.inspector_user_id,
            v_inspection.inspection_criteria,
            v_inspection.id, true,
            v_inspection.qms_id, v_inspection.qms_method_id, v_inspection.qms_scheduled_activity_id,
            p_user_id
        )
        RETURNING id INTO v_new_id;

        -- Update reassessment count on parent
        UPDATE quality_inspections
        SET reassessment_count = COALESCE(reassessment_count, 0) + 1,
            updated_at = NOW(),
            updated_by = p_user_id
        WHERE id = p_activity_id;
    ELSE
        RAISE EXCEPTION 'Invalid activity type: %', p_activity_type;
    END IF;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_quality_reassessment(VARCHAR, UUID, UUID) IS 'Creates a reassessment for a failed quality activity';

-- ============================================================================
-- SECTION 7: CREATE UNIFIED VIEW
-- ============================================================================

CREATE OR REPLACE VIEW quality_activities_view AS
SELECT
    'review' as activity_type,
    qr.id as activity_id,
    qr.activity_identifier,
    qr.project_id,
    p.project_name,
    p.project_code,
    qr.programme_id,
    prog.programme_name,
    qr.quality_register_id as product_id,
    reg.product_name as product_title,
    reg.product_reference as product_identifier,
    qr.review_type as quality_method,
    qr.review_outcome as result,
    qr.review_status as activity_status,
    qr.planned_date,
    qr.forecast_date,
    qr.actual_start_datetime::date as actual_date,
    qr.sign_off_planned_date,
    qr.sign_off_forecast_date,
    qr.sign_off_date as sign_off_actual_date,
    qr.is_reassessment,
    qr.parent_review_id as parent_activity_id,
    qr.reassessment_count,
    qr.quality_records_refs,
    qr.qms_id,
    qr.qms_method_id,
    qr.created_at,
    qr.created_by
FROM quality_reviews qr
LEFT JOIN projects p ON qr.project_id = p.id
LEFT JOIN programmes prog ON qr.programme_id = prog.id
LEFT JOIN quality_register reg ON qr.quality_register_id = reg.id
WHERE qr.is_deleted = false

UNION ALL

SELECT
    'inspection' as activity_type,
    qi.id as activity_id,
    qi.activity_identifier,
    qi.project_id,
    p.project_name,
    p.project_code,
    qi.programme_id,
    prog.programme_name,
    qi.quality_register_id as product_id,
    reg.product_name as product_title,
    reg.product_reference as product_identifier,
    qi.inspection_type as quality_method,
    qi.inspection_result as result,
    CASE WHEN qi.inspection_completed THEN 'completed' ELSE 'in_progress' END as activity_status,
    qi.inspection_date as planned_date,
    qi.forecast_date,
    qi.inspection_date as actual_date,
    qi.sign_off_planned_date,
    qi.sign_off_forecast_date,
    qi.sign_off_actual_date,
    qi.is_reassessment,
    qi.parent_inspection_id as parent_activity_id,
    qi.reassessment_count,
    qi.quality_records_refs,
    qi.qms_id,
    qi.qms_method_id,
    qi.created_at,
    qi.created_by
FROM quality_inspections qi
LEFT JOIN projects p ON qi.project_id = p.id
LEFT JOIN programmes prog ON qi.programme_id = prog.id
LEFT JOIN quality_register reg ON qi.quality_register_id = reg.id
WHERE qi.is_deleted = false

ORDER BY created_at DESC;

COMMENT ON VIEW quality_activities_view IS 'Unified view of all quality activities (reviews and inspections) for register display';

-- ============================================================================
-- SECTION 8: MIGRATE EXISTING DATA
-- ============================================================================

-- Generate activity identifiers for existing reviews and inspections
DO $$
DECLARE
    v_review RECORD;
    v_inspection RECORD;
BEGIN
    -- Update existing reviews
    FOR v_review IN SELECT id FROM quality_reviews WHERE (activity_identifier IS NULL OR activity_identifier = '') AND is_deleted = false
    LOOP
        UPDATE quality_reviews
        SET activity_identifier = generate_quality_activity_identifier()
        WHERE id = v_review.id;
    END LOOP;

    -- Update existing inspections
    FOR v_inspection IN SELECT id FROM quality_inspections WHERE (activity_identifier IS NULL OR activity_identifier = '') AND is_deleted = false
    LOOP
        UPDATE quality_inspections
        SET activity_identifier = generate_quality_activity_identifier()
        WHERE id = v_inspection.id;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 9: REGISTER NEW TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('quality_activity_records', 'Quality records (test plans, checklists, evidence, reports) linked to quality activities', false, true, 'quality'),
    ('quality_activity_actions', 'Action items (corrective, preventive, improvement) resulting from quality activities', false, true, 'quality'),
    ('quality_inspection_participants', 'Participants in quality inspections with roles and attendance tracking', false, true, 'quality')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- End of v184_quality_register_enhancements.sql
-- ============================================================================
