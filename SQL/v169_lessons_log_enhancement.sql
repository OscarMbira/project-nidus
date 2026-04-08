-- ============================================================================
-- Lessons Log Enhancement - Unified Lessons Learned Module
-- Version: v169
-- Description: Enhances existing lessons_learned table and adds new Lessons Log structure
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Merges the existing lessons_learned table (from project closure) with the new
-- comprehensive Lessons Log plan to create a unified module that works throughout
-- the project lifecycle, not just at closure.
--
-- Strategy:
-- 1. Keep existing lessons_learned table but enhance it
-- 2. Add lessons_logs header table (one per project)
-- 3. Link lessons_learned to lessons_logs
-- 4. Add supporting tables (comments, attachments, actions, ratings, corporate repository)
-- 5. Migrate existing data to new structure
--
-- Prerequisites:
-- - v30_closing_project.sql must be run first (lessons_learned table exists)
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v84_accounts_and_extensions.sql must be run (accounts table and projects.account_id)
-- - projects table must exist
-- - users table must exist
-- - accounts table must exist
--
-- ============================================================================
-- SECTION 1: CREATE LESSONS_LOGS HEADER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One log per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Log Identification
    log_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., LL-2026-001
    document_ref VARCHAR(100), -- External document reference
    version_number VARCHAR(20) DEFAULT '1.0',
    release VARCHAR(50), -- Release/version identifier

    -- Ownership
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Process Documentation
    update_process TEXT, -- Defined process for updates
    access_control_notes TEXT, -- Access control documentation

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_logs_project_id ON lessons_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_lessons_logs_log_reference ON lessons_logs(log_reference);
CREATE INDEX IF NOT EXISTS idx_lessons_logs_author_id ON lessons_logs(author_id);
CREATE INDEX IF NOT EXISTS idx_lessons_logs_owner_id ON lessons_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_lessons_logs_is_active ON lessons_logs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_lessons_logs_is_deleted ON lessons_logs(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_lessons_logs_before_insert ON lessons_logs;
CREATE TRIGGER trg_lessons_logs_before_insert
    BEFORE INSERT ON lessons_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_lessons_logs_before_update ON lessons_logs;
CREATE TRIGGER trg_lessons_logs_before_update
    BEFORE UPDATE ON lessons_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE lessons_logs IS 'Lessons Log header - one log per project for capturing lessons learned throughout project lifecycle';
COMMENT ON COLUMN lessons_logs.log_reference IS 'Unique reference number (e.g., LL-2026-001)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_logs', 'Lessons Log header - one log per project for capturing lessons learned', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 2: ENHANCE EXISTING lessons_learned TABLE
-- ============================================================================

-- Add new columns to existing lessons_learned table
DO $$
BEGIN
    -- Add lessons_log_id to link to lessons_logs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'lessons_log_id'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN lessons_log_id UUID REFERENCES lessons_logs(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_lessons_learned_lessons_log_id ON lessons_learned(lessons_log_id);
    END IF;

    -- Add lesson_number for sequential numbering
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'lesson_number'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN lesson_number INTEGER;
    END IF;

    -- Add lesson_scope (project/corporate/both)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'lesson_scope'
    ) THEN
        -- Create enum if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'lesson_scope_type'
        ) THEN
            EXECUTE 'CREATE TYPE lesson_scope_type AS ENUM (
                ''project'',
                ''corporate'',
                ''programme'',
                ''both_project_corporate'',
                ''both_project_programme''
            )';
        END IF;
        ALTER TABLE lessons_learned ADD COLUMN lesson_scope lesson_scope_type DEFAULT 'project';
        CREATE INDEX IF NOT EXISTS idx_lessons_learned_lesson_scope ON lessons_learned(lesson_scope);
    END IF;

    -- Add is_corporate_lesson flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'is_corporate_lesson'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN is_corporate_lesson BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_lessons_learned_is_corporate_lesson ON lessons_learned(is_corporate_lesson) WHERE is_corporate_lesson = TRUE;
    END IF;

    -- Add effect_type enum (positive/negative/neutral)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'effect_type'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'effect_type_enum'
        ) THEN
            EXECUTE 'CREATE TYPE effect_type_enum AS ENUM (''positive'', ''negative'', ''neutral'')';
        END IF;
        -- Map existing lesson_type to effect_type
        ALTER TABLE lessons_learned ADD COLUMN effect_type effect_type_enum;
        UPDATE lessons_learned SET effect_type = CASE
            WHEN lesson_type IN ('success', 'best-practice') THEN 'positive'::effect_type_enum
            WHEN lesson_type IN ('challenge') THEN 'negative'::effect_type_enum
            ELSE 'neutral'::effect_type_enum
        END;
        ALTER TABLE lessons_learned ALTER COLUMN effect_type SET DEFAULT 'neutral';
        CREATE INDEX IF NOT EXISTS idx_lessons_learned_effect_type ON lessons_learned(effect_type);
    END IF;

    -- Add status enum
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'status'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'lesson_status_enum'
        ) THEN
            CREATE TYPE lesson_status_enum AS ENUM (
                'logged',
                'under_review',
                'action_required',
                'action_taken',
                'closed',
                'rejected'
            );
        END IF;
        ALTER TABLE lessons_learned ADD COLUMN status lesson_status_enum DEFAULT 'logged';
        -- Map follow_up_status to status
        UPDATE lessons_learned SET status = CASE
            WHEN follow_up_status = 'completed' THEN 'action_taken'::lesson_status_enum
            WHEN follow_up_status = 'in-progress' THEN 'action_required'::lesson_status_enum
            WHEN follow_up_status = 'pending' AND follow_up_required = TRUE THEN 'action_required'::lesson_status_enum
            WHEN validated = TRUE THEN 'closed'::lesson_status_enum
            ELSE 'logged'::lesson_status_enum
        END;
        CREATE INDEX IF NOT EXISTS idx_lessons_learned_status ON lessons_learned(status);
    END IF;

    -- Add priority enum
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'priority'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'lesson_priority_enum'
        ) THEN
            EXECUTE 'CREATE TYPE lesson_priority_enum AS ENUM (''low'', ''medium'', ''high'', ''critical'')';
        END IF;
        -- Map impact_level to priority
        ALTER TABLE lessons_learned ADD COLUMN priority lesson_priority_enum;
        UPDATE lessons_learned SET priority = CASE
            WHEN impact_level = 'critical' THEN 'critical'::lesson_priority_enum
            WHEN impact_level = 'high' THEN 'high'::lesson_priority_enum
            WHEN impact_level = 'medium' THEN 'medium'::lesson_priority_enum
            ELSE 'low'::lesson_priority_enum
        END;
        ALTER TABLE lessons_learned ALTER COLUMN priority SET DEFAULT 'medium';
        CREATE INDEX IF NOT EXISTS idx_lessons_learned_priority ON lessons_learned(priority);
    END IF;

    -- Add tags array (if not exists)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'tags'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN tags TEXT[];
        CREATE INDEX IF NOT EXISTS idx_lessons_learned_tags ON lessons_learned USING GIN(tags) WHERE tags IS NOT NULL;
    END IF;

    -- Add event_description (map from what_happened)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'event_description'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN event_description TEXT;
        UPDATE lessons_learned SET event_description = what_happened WHERE event_description IS NULL;
    END IF;

    -- Add cause_description (map from why_it_happened or root_cause_analysis)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'cause_description'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN cause_description TEXT;
        UPDATE lessons_learned SET cause_description = COALESCE(root_cause_analysis, why_it_happened) WHERE cause_description IS NULL;
    END IF;

    -- Add early_warning_indicators
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'early_warning_indicators'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN early_warning_indicators TEXT;
    END IF;

    -- Add was_identified_risk
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'was_identified_risk'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN was_identified_risk BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add linked_risk_id (will be FK when risks table structure is confirmed)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'linked_risk_id'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN linked_risk_id UUID;
    END IF;

    -- Add related_product_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'related_product_id'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN related_product_id UUID;
    END IF;

    -- Add related_product_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'related_product_name'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN related_product_name VARCHAR(200);
    END IF;

    -- Add project_stage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'project_stage'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN project_stage VARCHAR(100);
        -- Map from project_phase if exists
        UPDATE lessons_learned SET project_stage = project_phase WHERE project_stage IS NULL AND project_phase IS NOT NULL;
    END IF;

    -- Add date_actioned and actioned_by_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'date_actioned'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN date_actioned DATE;
        UPDATE lessons_learned SET date_actioned = validation_date WHERE date_actioned IS NULL AND follow_up_status = 'completed';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'actioned_by_id'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN actioned_by_id UUID REFERENCES users(id) ON DELETE SET NULL;
        UPDATE lessons_learned SET actioned_by_id = validated_by WHERE actioned_by_id IS NULL AND validated_by IS NOT NULL;
    END IF;

    -- Add action_notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'action_notes'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN action_notes TEXT;
        UPDATE lessons_learned SET action_notes = validation_notes WHERE action_notes IS NULL AND validation_notes IS NOT NULL;
    END IF;

    -- Add logged_by_name (for external people)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons_learned' AND column_name = 'logged_by_name'
    ) THEN
        ALTER TABLE lessons_learned ADD COLUMN logged_by_name VARCHAR(200);
    END IF;

    -- Ensure lesson_reference is unique if not already
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_lesson_reference'
    ) THEN
        ALTER TABLE lessons_learned ADD CONSTRAINT unique_lesson_reference UNIQUE (lesson_reference);
    END IF;

    -- Add full-text search index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lessons_learned_search'
    ) THEN
        CREATE INDEX idx_lessons_learned_search ON lessons_learned USING GIN(
            to_tsvector('english', 
                COALESCE(lesson_title, '') || ' ' || 
                COALESCE(what_happened, '') || ' ' || 
                COALESCE(impact_description, '') || ' ' || 
                COALESCE(recommendations, '')
            )
        );
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: CREATE SUPPORTING TABLES
-- ============================================================================

-- ============================================================================
-- TABLE: lessons_log_revision_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_log_revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lessons_log_id UUID NOT NULL REFERENCES lessons_logs(id) ON DELETE CASCADE,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE,
    summary_of_changes TEXT NOT NULL,
    changes_marked TEXT,
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_log_revision_history_log_id ON lessons_log_revision_history(lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_lessons_log_revision_history_revision_date ON lessons_log_revision_history(revision_date DESC);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_log_revision_history', 'Revision history tracking for lessons log document', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: lessons_log_approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_log_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lessons_log_id UUID NOT NULL REFERENCES lessons_logs(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approver_name VARCHAR(200) NOT NULL,
    approver_title VARCHAR(200),
    signature_data TEXT,
    approval_date DATE NOT NULL DEFAULT CURRENT_DATE,
    version_approved VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_log_approvals_log_id ON lessons_log_approvals(lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_lessons_log_approvals_approval_date ON lessons_log_approvals(approval_date DESC);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_log_approvals', 'Approval records for lessons log document versions', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: lessons_log_distribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons_log_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lessons_log_id UUID NOT NULL REFERENCES lessons_logs(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_title VARCHAR(200),
    date_of_issue DATE NOT NULL DEFAULT CURRENT_DATE,
    version_distributed VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_log_distribution_log_id ON lessons_log_distribution(lessons_log_id);
CREATE INDEX IF NOT EXISTS idx_lessons_log_distribution_date_of_issue ON lessons_log_distribution(date_of_issue DESC);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lessons_log_distribution', 'Distribution records for lessons log document versions', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: corporate_lessons_repository
-- ============================================================================

CREATE TABLE IF NOT EXISTS corporate_lessons_repository (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons_learned(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    promoted_date DATE NOT NULL DEFAULT CURRENT_DATE,
    promoted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    applicability_notes TEXT,
    project_type_tags TEXT[],
    industry_tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    usefulness_rating DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_lesson_id ON corporate_lessons_repository(lesson_id);
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_organisation_id ON corporate_lessons_repository(organisation_id);
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_is_active ON corporate_lessons_repository(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_corporate_lessons_repository_project_type_tags ON corporate_lessons_repository USING GIN(project_type_tags) WHERE project_type_tags IS NOT NULL;

DROP TRIGGER IF EXISTS trg_corporate_lessons_repository_before_update ON corporate_lessons_repository;
CREATE TRIGGER trg_corporate_lessons_repository_before_update
    BEFORE UPDATE ON corporate_lessons_repository
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('corporate_lessons_repository', 'Organization-wide repository of lessons promoted from projects', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: lesson_comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS lesson_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons_learned(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    commented_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson_id ON lesson_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_commented_by ON lesson_comments(commented_by);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_created_at ON lesson_comments(created_at DESC);

DROP TRIGGER IF EXISTS trg_lesson_comments_before_insert ON lesson_comments;
CREATE TRIGGER trg_lesson_comments_before_insert
    BEFORE INSERT ON lesson_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_lesson_comments_before_update ON lesson_comments;
CREATE TRIGGER trg_lesson_comments_before_update
    BEFORE UPDATE ON lesson_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lesson_comments', 'Discussion comments on lessons', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: lesson_attachments
-- ============================================================================

CREATE TABLE IF NOT EXISTS lesson_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons_learned(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    description TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_attachments_lesson_id ON lesson_attachments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_uploaded_by ON lesson_attachments(uploaded_by);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lesson_attachments', 'Supporting documents/files attached to lessons', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: lesson_actions
-- ============================================================================

-- Create action_status_enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_status_enum') THEN
        EXECUTE 'CREATE TYPE action_status_enum AS ENUM (''pending'', ''in_progress'', ''completed'', ''cancelled'')';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS lesson_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons_learned(id) ON DELETE CASCADE,
    action_description TEXT NOT NULL,
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(200),
    target_date DATE,
    status action_status_enum NOT NULL DEFAULT 'pending',
    completion_notes TEXT,
    completed_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_actions_lesson_id ON lesson_actions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_actions_assigned_to_id ON lesson_actions(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_lesson_actions_status ON lesson_actions(status);
CREATE INDEX IF NOT EXISTS idx_lesson_actions_target_date ON lesson_actions(target_date) WHERE target_date IS NOT NULL;

DROP TRIGGER IF EXISTS trg_lesson_actions_before_insert ON lesson_actions;
CREATE TRIGGER trg_lesson_actions_before_insert
    BEFORE INSERT ON lesson_actions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_lesson_actions_before_update ON lesson_actions;
CREATE TRIGGER trg_lesson_actions_before_update
    BEFORE UPDATE ON lesson_actions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lesson_actions', 'Actions derived from lesson recommendations', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: lesson_ratings
-- ============================================================================

CREATE TABLE IF NOT EXISTS lesson_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons_learned(id) ON DELETE CASCADE,
    rated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    was_helpful BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_rating_per_user UNIQUE (lesson_id, rated_by)
);

CREATE INDEX IF NOT EXISTS idx_lesson_ratings_lesson_id ON lesson_ratings(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_rated_by ON lesson_ratings(rated_by);
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_rating ON lesson_ratings(rating DESC);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('lesson_ratings', 'Usefulness ratings for lessons (1-5 scale)', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 4: FUNCTIONS
-- ============================================================================

-- ============================================================================
-- FUNCTION: generate_lessons_log_reference()
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_lessons_log_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT COALESCE(MAX(CAST(SUBSTRING(log_reference FROM 8) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM lessons_logs
    WHERE log_reference LIKE 'LL-' || v_year || '-%';
    v_reference := 'LL-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_lessons_log_reference() IS 'Generates unique lessons log reference number (LL-YYYY-NNN)';

-- ============================================================================
-- FUNCTION: generate_lesson_reference()
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_lesson_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT COALESCE(MAX(CAST(SUBSTRING(lesson_reference FROM 6) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM lessons_learned
    WHERE lesson_reference LIKE 'L-' || v_year || '-%';
    v_reference := 'L-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_lesson_reference() IS 'Generates unique lesson reference number (L-YYYY-NNN)';

-- ============================================================================
-- FUNCTION: generate_lesson_number(p_lessons_log_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_lesson_number(p_lessons_log_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(lesson_number), 0) + 1
    INTO v_next_number
    FROM lessons_learned
    WHERE lessons_log_id = p_lessons_log_id
      AND is_deleted = FALSE;
    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_lesson_number(UUID) IS 'Generates sequential lesson number within a lessons log';

-- ============================================================================
-- FUNCTION: create_lessons_log_for_project(p_project_id UUID, p_user_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_lessons_log_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_reference VARCHAR(50);
BEGIN
    SELECT id INTO v_log_id
    FROM lessons_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NOT NULL THEN
        RETURN v_log_id;
    END IF;

    v_reference := generate_lessons_log_reference();

    INSERT INTO lessons_logs (
        project_id,
        log_reference,
        author_id,
        owner_id,
        created_by,
        is_active
    )
    VALUES (
        p_project_id,
        v_reference,
        p_user_id,
        p_user_id,
        p_user_id,
        TRUE
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_lessons_log_for_project(UUID, UUID) IS 'Creates lessons log when project is initiated';

-- ============================================================================
-- FUNCTION: migrate_existing_lessons_to_logs()
-- ============================================================================
-- Migrates existing lessons_learned records to link with lessons_logs
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_existing_lessons_to_logs()
RETURNS VOID AS $$
DECLARE
    v_project RECORD;
    v_log_id UUID;
    v_user_id UUID;
BEGIN
    -- For each project with lessons, create a lessons_log if it doesn't exist
    FOR v_project IN
        SELECT DISTINCT project_id, created_by
        FROM lessons_learned
        WHERE lessons_log_id IS NULL
          AND is_deleted = FALSE
    LOOP
        -- Get or create lessons_log
        SELECT id INTO v_log_id
        FROM lessons_logs
        WHERE project_id = v_project.project_id
          AND is_deleted = FALSE;

        IF v_log_id IS NULL THEN
            v_user_id := COALESCE(v_project.created_by, (SELECT id FROM users LIMIT 1));
            SELECT create_lessons_log_for_project(v_project.project_id, v_user_id) INTO v_log_id;
        END IF;

        -- Link existing lessons to the log
        UPDATE lessons_learned
        SET lessons_log_id = v_log_id,
            lesson_number = (
                SELECT COALESCE(MAX(lesson_number), 0) + ROW_NUMBER() OVER (ORDER BY lesson_date, created_at)
                FROM lessons_learned l2
                WHERE l2.project_id = lessons_learned.project_id
                  AND l2.lessons_log_id = v_log_id
                  AND l2.id <= lessons_learned.id
            )
        WHERE project_id = v_project.project_id
          AND lessons_log_id IS NULL
          AND is_deleted = FALSE;

        -- Generate lesson references if missing
        UPDATE lessons_learned
        SET lesson_reference = generate_lesson_reference()
        WHERE lesson_reference IS NULL
          AND is_deleted = FALSE;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION migrate_existing_lessons_to_logs() IS 'Migrates existing lessons_learned records to link with lessons_logs';

-- ============================================================================
-- FUNCTION: promote_to_corporate()
-- ============================================================================

CREATE OR REPLACE FUNCTION promote_to_corporate(
    p_lesson_id UUID,
    p_user_id UUID,
    p_organisation_id UUID,
    p_applicability_notes TEXT DEFAULT NULL,
    p_project_type_tags TEXT[] DEFAULT NULL,
    p_industry_tags TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_lesson RECORD;
    v_corporate_id UUID;
BEGIN
    SELECT * INTO v_lesson
    FROM lessons_learned
    WHERE id = p_lesson_id
      AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lesson not found';
    END IF;

    SELECT id INTO v_corporate_id
    FROM corporate_lessons_repository
    WHERE lesson_id = p_lesson_id
      AND organisation_id = p_organisation_id
      AND is_active = TRUE;

    IF v_corporate_id IS NOT NULL THEN
        RETURN v_corporate_id;
    END IF;

    INSERT INTO corporate_lessons_repository (
        lesson_id,
        organisation_id,
        promoted_date,
        promoted_by,
        applicability_notes,
        project_type_tags,
        industry_tags,
        is_active
    )
    VALUES (
        p_lesson_id,
        p_organisation_id,
        CURRENT_DATE,
        p_user_id,
        p_applicability_notes,
        p_project_type_tags,
        p_industry_tags,
        TRUE
    )
    RETURNING id INTO v_corporate_id;

    UPDATE lessons_learned
    SET lesson_scope = CASE
        WHEN lesson_scope = 'project' THEN 'both_project_corporate'::lesson_scope_type
        ELSE lesson_scope
    END,
    is_corporate_lesson = TRUE,
    shared_with_organization = TRUE,
    sharing_date = CURRENT_DATE,
    updated_at = NOW(),
    updated_by = p_user_id
    WHERE id = p_lesson_id;

    RETURN v_corporate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION promote_to_corporate(UUID, UUID, UUID, TEXT, TEXT[], TEXT[]) IS 'Promotes a lesson to the corporate repository';

-- ============================================================================
-- FUNCTION: get_relevant_corporate_lessons()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_relevant_corporate_lessons(p_project_id UUID)
RETURNS TABLE (
    lesson_id UUID,
    title VARCHAR,
    recommendations TEXT,
    category VARCHAR,
    relevance_score DECIMAL
) AS $$
DECLARE
    v_project RECORD;
    v_organisation_id UUID;
BEGIN
    SELECT p.*, a.id as account_id
    INTO v_project
    FROM projects p
    LEFT JOIN accounts a ON p.account_id = a.id
    WHERE p.id = p_project_id
      AND p.is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_organisation_id := v_project.account_id;

    RETURN QUERY
    SELECT
        l.id as lesson_id,
        l.lesson_title,
        l.recommendations,
        l.lesson_category::VARCHAR,
        CASE
            WHEN v_project.project_type = ANY(clr.project_type_tags) THEN 1.0
            WHEN array_length(clr.project_type_tags, 1) IS NULL THEN 0.5
            ELSE 0.3
        END as relevance_score
    FROM corporate_lessons_repository clr
    JOIN lessons_learned l ON clr.lesson_id = l.id
    WHERE clr.organisation_id = v_organisation_id
      AND clr.is_active = TRUE
      AND l.is_deleted = FALSE
    ORDER BY relevance_score DESC, clr.usefulness_rating DESC NULLS LAST, clr.view_count DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_relevant_corporate_lessons(UUID) IS 'Returns corporate lessons relevant to a project based on type and tags';

-- ============================================================================
-- FUNCTION: get_lessons_summary()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lessons_summary(p_project_id UUID)
RETURNS TABLE (
    total_lessons INTEGER,
    positive_lessons INTEGER,
    negative_lessons INTEGER,
    lessons_by_category JSONB,
    lessons_by_status JSONB,
    corporate_lessons INTEGER,
    actions_pending INTEGER
) AS $$
DECLARE
    v_log_id UUID;
BEGIN
    SELECT id INTO v_log_id
    FROM lessons_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_lessons,
        COUNT(*) FILTER (WHERE l.effect_type = 'positive')::INTEGER as positive_lessons,
        COUNT(*) FILTER (WHERE l.effect_type = 'negative')::INTEGER as negative_lessons,
        jsonb_object_agg(
            l.lesson_category::TEXT,
            COUNT(*)::INTEGER
        ) as lessons_by_category,
        jsonb_object_agg(
            l.status::TEXT,
            COUNT(*)::INTEGER
        ) as lessons_by_status,
        COUNT(*) FILTER (WHERE l.is_corporate_lesson = TRUE)::INTEGER as corporate_lessons,
        (
            SELECT COUNT(*)::INTEGER
            FROM lesson_actions la
            WHERE la.lesson_id IN (SELECT id FROM lessons_learned WHERE lessons_log_id = v_log_id)
              AND la.status IN ('pending', 'in_progress')
              AND la.is_deleted = FALSE
        ) as actions_pending
    FROM lessons_learned l
    WHERE l.lessons_log_id = v_log_id
      AND l.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_lessons_summary(UUID) IS 'Returns summary statistics for a project''s lessons log';

-- ============================================================================
-- FUNCTION: update_usefulness_rating()
-- ============================================================================

CREATE OR REPLACE FUNCTION update_usefulness_rating(p_lesson_id UUID)
RETURNS VOID AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
BEGIN
    SELECT AVG(rating)::DECIMAL(3,2)
    INTO v_avg_rating
    FROM lesson_ratings
    WHERE lesson_id = p_lesson_id;

    UPDATE corporate_lessons_repository
    SET usefulness_rating = v_avg_rating,
        updated_at = NOW()
    WHERE lesson_id = p_lesson_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_usefulness_rating(UUID) IS 'Updates average usefulness rating for corporate lessons';

-- ============================================================================
-- SECTION 5: TRIGGERS
-- ============================================================================

-- Auto-generate log_reference
CREATE OR REPLACE FUNCTION trg_lessons_logs_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.log_reference IS NULL OR NEW.log_reference = '' THEN
        NEW.log_reference := generate_lessons_log_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lessons_logs_before_insert_reference ON lessons_logs;
CREATE TRIGGER trg_lessons_logs_before_insert_reference
    BEFORE INSERT ON lessons_logs
    FOR EACH ROW
    WHEN (NEW.log_reference IS NULL OR NEW.log_reference = '')
    EXECUTE FUNCTION trg_lessons_logs_generate_reference();

-- Auto-generate lesson_reference
CREATE OR REPLACE FUNCTION trg_lessons_learned_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lesson_reference IS NULL OR NEW.lesson_reference = '' THEN
        NEW.lesson_reference := generate_lesson_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lessons_learned_before_insert_reference ON lessons_learned;
CREATE TRIGGER trg_lessons_learned_before_insert_reference
    BEFORE INSERT ON lessons_learned
    FOR EACH ROW
    WHEN (NEW.lesson_reference IS NULL OR NEW.lesson_reference = '')
    EXECUTE FUNCTION trg_lessons_learned_generate_reference();

-- Auto-generate lesson_number
CREATE OR REPLACE FUNCTION trg_lessons_learned_generate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lesson_number IS NULL AND NEW.lessons_log_id IS NOT NULL THEN
        NEW.lesson_number := generate_lesson_number(NEW.lessons_log_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lessons_learned_before_insert_number ON lessons_learned;
CREATE TRIGGER trg_lessons_learned_before_insert_number
    BEFORE INSERT ON lessons_learned
    FOR EACH ROW
    WHEN (NEW.lesson_number IS NULL AND NEW.lessons_log_id IS NOT NULL)
    EXECUTE FUNCTION trg_lessons_learned_generate_number();

-- Auto-create lessons log when project is initiated
CREATE OR REPLACE FUNCTION trg_projects_create_lessons_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT created_by INTO v_user_id
    FROM projects
    WHERE id = NEW.id;
    PERFORM create_lessons_log_for_project(NEW.id, COALESCE(v_user_id, NEW.created_by));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_projects_after_insert_lessons_log ON projects;
CREATE TRIGGER trg_projects_after_insert_lessons_log
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trg_projects_create_lessons_log();

-- Auto-promote to corporate when scope includes corporate
CREATE OR REPLACE FUNCTION trg_lessons_learned_auto_promote_corporate()
RETURNS TRIGGER AS $$
DECLARE
    v_organisation_id UUID;
BEGIN
    IF NEW.lesson_scope NOT IN ('corporate', 'both_project_corporate', 'both_project_programme') THEN
        RETURN NEW;
    END IF;

    SELECT p.account_id INTO v_organisation_id
    FROM lessons_logs ll
    JOIN projects p ON ll.project_id = p.id
    WHERE ll.id = NEW.lessons_log_id;

    IF v_organisation_id IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM promote_to_corporate(
        NEW.id,
        NEW.created_by,
        v_organisation_id,
        NULL, NULL, NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lessons_learned_after_insert_promote ON lessons_learned;
CREATE TRIGGER trg_lessons_learned_after_insert_promote
    AFTER INSERT ON lessons_learned
    FOR EACH ROW
    EXECUTE FUNCTION trg_lessons_learned_auto_promote_corporate();

-- Update usefulness_rating when new rating is added
CREATE OR REPLACE FUNCTION trg_lesson_ratings_update_rating()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_usefulness_rating(NEW.lesson_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lesson_ratings_after_insert_rating ON lesson_ratings;
CREATE TRIGGER trg_lesson_ratings_after_insert_rating
    AFTER INSERT ON lesson_ratings
    FOR EACH ROW
    EXECUTE FUNCTION trg_lesson_ratings_update_rating();

-- ============================================================================
-- SECTION 6: MIGRATE EXISTING DATA
-- ============================================================================

-- Run migration to link existing lessons to logs
SELECT migrate_existing_lessons_to_logs();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    tables_count INTEGER;
    functions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_count
    FROM database_tables
    WHERE table_name IN (
        'lessons_logs',
        'lessons_learned',
        'lessons_log_revision_history',
        'lessons_log_approvals',
        'lessons_log_distribution',
        'corporate_lessons_repository',
        'lesson_comments',
        'lesson_attachments',
        'lesson_actions',
        'lesson_ratings'
    );

    SELECT COUNT(*) INTO functions_count
    FROM pg_proc
    WHERE proname IN (
        'generate_lessons_log_reference',
        'generate_lesson_reference',
        'generate_lesson_number',
        'create_lessons_log_for_project',
        'migrate_existing_lessons_to_logs',
        'promote_to_corporate',
        'get_relevant_corporate_lessons',
        'get_lessons_summary',
        'update_usefulness_rating'
    );

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Lessons Log Enhancement Complete';
    RAISE NOTICE 'Tables: %', tables_count;
    RAISE NOTICE 'Functions: %', functions_count;
    RAISE NOTICE '========================================';
END $$;
